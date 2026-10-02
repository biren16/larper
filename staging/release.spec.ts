import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import type { Database } from "../src/data/postgres/database.types";
import { canonicalizeUrl } from "../src/backend/ingestion/canonical-url";
import { assertSourceRegistryMatches, readStagingConfig, readStagingInput } from "./config";

const config = readStagingConfig(process.env);
const input = readStagingInput(JSON.parse(readFileSync(config.inputFile, "utf8")));

function checked<T>(operation: string, result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error || result.data === null) throw new Error(`${operation} failed; inspect the staging database`);
  return result.data as NonNullable<T>;
}

async function unpublish(page: Page, candidateId: string, note: string) {
  await page.goto(`/studio/candidates/${candidateId}`);
  await page.getByText("More actions", { exact: true }).click();
  await page.getByLabel("Review note").fill(note);
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\?notice=story-unpublished$/);
}

test("real staging source to publication and removal", async ({ page, browser }, testInfo) => {
  const database = createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonymous = await browser.newContext({ baseURL: config.appUrl, storageState: { cookies: [], origins: [] } });
  const publicPage = await anonymous.newPage();
  const runName = `staging-smoke-${randomUUID()}`;
  const sourceName = `Staging RSS ${runName}`;
  const report: {
    runName: string; appUrl: string; startedAt: string; finishedAt?: string;
    status: string; stages: string[]; ingestionRunId?: string; sourceId?: string;
    candidateId?: string; storyId?: string; storyUrl?: string; mediaId?: string;
    cleanupErrors: string[];
  } = { runName, appUrl: config.appUrl, startedAt: new Date().toISOString(), status: "running", stages: [], cleanupErrors: [] };
  let sourceCreated = false;
  let candidateId: string | undefined;
  let slug = runName;
  let publicationAttempted = false;
  try {
    await test.step("authenticate founder and verify anonymous Studio restriction", async () => {
      await page.goto("/studio/sources");
      await expect(page.getByRole("heading", { name: "Watchlists", exact: true })).toBeVisible();
      await publicPage.goto("/studio");
      await expect(publicPage).toHaveURL(/\/auth\?next=/);
      // Check the database before creating a source. A wrong service key fails here.
      checked("Load staging niches", await database.from("niches").select("id").eq("id", input.manual.nicheId).single());
      const manualSources = checked("Load manual intake", await database.from("source_definitions").select("id").eq("adapter_type", "manual"));
      expect(manualSources, "Seed exactly one manual intake source on staging").toHaveLength(1);
      const registry = checked("Load staging source registry", await database.from("source_definitions").select("id").in("adapter_type", ["rss", "youtube"]));
      const visibleIds = await page.locator('input[name="sourceId"]').evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value));
      assertSourceRegistryMatches(visibleIds, registry.map((row) => row.id));
      report.stages.push("founder-session-and-anonymous-access");
    });

    await test.step("add and activate the approved RSS source through Studio", async () => {
      const form = page.getByRole("form", { name: "Add a source" });
      await form.getByLabel("Source name", { exact: true }).fill(sourceName);
      await form.getByLabel("Beat", { exact: true }).selectOption(input.feed.beat);
      await form.getByLabel("Adapter", { exact: true }).selectOption("rss");
      await form.getByLabel("Trust tier", { exact: true }).selectOption(input.feed.trustTier);
      await form.getByLabel("Feed URL, channel ID, or search query").fill(input.feed.url);
      await form.getByLabel("Region", { exact: true }).fill(input.manual.region);
      await form.getByRole("button", { name: "Add paused source" }).click();
      await expect(page).toHaveURL(/notice=source-added/);
      sourceCreated = true;
      // Proves that the deployed app writes to the configured staging project.
      const source = checked("Verify app and staging database match", await database.from("source_definitions").select("id, active").eq("name", sourceName).single());
      report.sourceId = source.id;
      expect(source.active).toBe(false);
      await page.getByRole("button", { name: `Activate ${sourceName}`, exact: true }).click();
      await expect(page).toHaveURL(/notice=source-activated/);
      report.stages.push("studio-source-created-and-activated");
    });

    await test.step("run the deployed ingestion function and verify source health", async () => {
      const startedAt = new Date().toISOString();
      // Native fetch keeps the ingestion bearer secret out of Playwright reports.
      const response = await fetch(`${config.supabaseUrl}/functions/v1/ingest`, {
        method: "POST", headers: { authorization: `Bearer ${config.ingestionSecret}` },
        signal: AbortSignal.timeout(90_000), redirect: "error",
      });
      expect(response.ok, "The deployed ingestion function must return success").toBe(true);
      const result = await response.json();
      expect(result.status).toBe("succeeded");
      expect(result.errorCount).toBe(0);
      const runs = checked("Load completed ingestion run", await database.from("ingestion_runs").select("id, status, finished_at, error_count").gte("started_at", startedAt));
      expect(runs, "Do not overlap this smoke run with another ingestion run").toHaveLength(1);
      expect(runs[0].status).toBe("succeeded");
      expect(runs[0].finished_at).toBeTruthy();
      report.ingestionRunId = runs[0].id;
      const signals = checked("Load collected RSS evidence", await database.from("raw_signals").select("id").eq("source_definition_id", report.sourceId!));
      expect(signals.length, "The real RSS feed must yield evidence").toBeGreaterThan(0);
      await page.goto("/studio/sources");
      const sourceRow = page.locator("article").filter({ has: page.getByRole("heading", { name: sourceName, exact: true }) });
      await expect(sourceRow.locator('[data-status="live"]')).toBeVisible();
      await expect(sourceRow).toContainText("0 unresolved failures");
      report.stages.push("deployed-ingestion-and-live-source");
    });

    await test.step("capture the reviewed manual signal and check clustering", async () => {
      await page.goto("/studio");
      const form = page.getByRole("form", { name: "Add a manual signal" });
      await form.getByLabel("Public URL", { exact: true }).fill(input.manual.url);
      await form.getByLabel("What is moving?").fill(input.manual.title);
      await form.getByLabel("Platform", { exact: true }).selectOption("web");
      await form.getByLabel("Region", { exact: true }).selectOption(input.manual.region);
      await form.getByLabel("Source name", { exact: true }).fill(input.manual.sourceName);
      await form.getByLabel("Niche", { exact: true }).selectOption(input.manual.nicheId);
      // datetime-local has no offset. Use the browser's local time for the actual instant.
      const publishedLocal = await page.evaluate((iso) => {
        const date = new Date(iso);
        return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
      }, input.manual.publishedAt);
      await form.getByLabel("Published at", { exact: true }).fill(publishedLocal);
      await form.getByRole("button", { name: "Add to evidence inbox" }).click();
      await expect(page).toHaveURL(/notice=signal-added/);
      const manualSource = checked("Load manual intake", await database.from("source_definitions").select("id").eq("adapter_type", "manual").single());
      const signal = checked("Load captured manual evidence", await database.from("raw_signals").select("id").eq("canonical_url", canonicalizeUrl(input.manual.url)).eq("source_definition_id", manualSource.id).single());
      const link = checked("Load clustered manual evidence", await database.from("cluster_signals").select("cluster_id").eq("raw_signal_id", signal.id).single());
      candidateId = link.cluster_id;
      report.candidateId = candidateId;
      const links = checked("Load candidate evidence", await database.from("cluster_signals").select("raw_signal_id").eq("cluster_id", candidateId));
      const evidence = checked("Load independent candidate sources", await database.from("raw_signals").select("source_definition_id, availability").in("id", links.map((row) => row.raw_signal_id)));
      expect(evidence.some((row) => row.source_definition_id === report.sourceId && row.availability === "available"), "The RSS report and manual report must naturally cluster; choose matching real evidence").toBe(true);
      expect(new Set(evidence.filter((row) => row.availability === "available").map((row) => row.source_definition_id)).size).toBeGreaterThanOrEqual(2);
      const existing = await database.from("stories").select("slug, lifecycle").eq("cluster_id", candidateId).maybeSingle();
      expect(existing.error).toBeNull();
      if (existing.data) {
        expect(existing.data.slug, "Only a previous staging smoke story may be reused").toMatch(/^staging-smoke-/);
        expect(existing.data.lifecycle).toBe("reviewing");
        slug = existing.data.slug;
      }
      report.storyUrl = `${config.appUrl}/discover/${slug}`;
      await page.goto(`/studio/candidates/${candidateId}`);
      await expect(page.getByRole("form", { name: "Story editor" })).toBeVisible();
      report.stages.push("manual-intake-and-two-source-cluster");
    });

    await test.step("upload and select a permitted WebP through Studio", async () => {
      // A code-created test swatch, dedicated to the public domain in the runbook.
      const bytes = await sharp({ create: { width: 320, height: 180, channels: 3, background: "#2859ce" } }).webp().toBuffer();
      const alt = `Staging cover ${runName}`;
      const form = page.getByRole("form", { name: "Upload approved image" });
      await form.locator('input[name="image"]').setInputFiles({ name: "staging-cover.webp", mimeType: "image/webp", buffer: bytes });
      await form.getByLabel("Alt text", { exact: true }).fill(alt);
      await form.getByLabel("Original source URL", { exact: true }).fill("https://github.com/biren16/larper/blob/codex/radar-trust-fixes/staging/release.spec.ts");
      await form.getByLabel("Credit line", { exact: true }).fill("LARPer staging test fixture");
      await form.getByLabel("Licence or permission record").fill("CC0-1.0; code-created test swatch");
      await form.getByLabel("Commercial display is permitted").check();
      await form.getByLabel("Social sharing is permitted").check();
      await form.getByRole("button", { name: "Upload image", exact: true }).click();
      await expect(page).toHaveURL(/notice=image-uploaded/);
      const asset = checked("Verify uploaded media rights", await database.from("media_assets").select("id, src, width, height, commercial_use_allowed, modification_allowed, social_use_allowed").eq("alt", alt).single());
      report.mediaId = asset.id;
      expect(asset.commercial_use_allowed).toBe(true);
      expect(asset.modification_allowed).toBe(false);
      expect(asset.social_use_allowed).toBe(true);
      expect([asset.width, asset.height]).toEqual([320, 180]);
      const delivery = await anonymous.request.get(asset.src);
      expect(delivery.ok(), "Storage must serve the uploaded cover anonymously").toBe(true);
      expect(await delivery.body()).toEqual(bytes);
      await page.getByLabel("Story image", { exact: true }).selectOption(asset.id);
      report.stages.push("studio-upload-rights-and-storage-delivery");
    });

    await test.step("publish through Studio and verify warmed anonymous caches", async () => {
      // Warm both paths before publishing so a stale cache cannot pass unnoticed.
      expect((await anonymous.request.get(`/discover/${slug}`)).status()).toBe(404);
      await publicPage.goto("/");
      await expect(publicPage.locator(`a[href="/discover/${slug}"]`)).toHaveCount(0);
      const form = page.getByRole("form", { name: "Story editor" });
      for (const [key, value] of Object.entries(input.story)) await form.locator(`[name="${key}"]`).fill(value);
      await form.locator('[name="nicheId"]').fill(input.manual.nicheId);
      await form.locator('[name="slug"]').fill(slug);
      await form.locator('[name="regions"]').fill(input.manual.region);
      await form.locator('[name="independentSourcesConfirmed"]').check();
      publicationAttempted = true;
      await form.getByRole("button", { name: "Publish story", exact: true }).click();
      await expect(page).toHaveURL(/notice=story-published/);
      const story = checked("Load published story", await database.from("stories").select("id, lifecycle, media_id").eq("slug", slug).single());
      report.storyId = story.id;
      expect(story.lifecycle).toBe("published_story");
      expect(story.media_id).toBe(report.mediaId);
      const events = checked("Load publication audit", await database.from("review_events").select("id").eq("story_id", story.id).eq("action", "publish_story"));
      expect(events.length).toBeGreaterThan(0);
      await publicPage.goto(`/discover/${slug}`);
      await expect(publicPage.getByRole("heading", { name: input.story.title, exact: true })).toBeVisible();
      await expect(publicPage.locator(`[data-testid="media-frame"][data-modification="restricted"]`)).toBeVisible();
      const image = publicPage.getByRole("img", { name: `Staging cover ${runName}`, exact: true });
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(320);
      await expect(publicPage.getByText("LARPer staging test fixture", { exact: true })).toBeVisible();
      await expect(publicPage.locator(`a[href="${canonicalizeUrl(input.manual.url)}"]`)).toHaveCount(1);
      await testInfo.attach("published-story", { body: await publicPage.screenshot({ fullPage: true }), contentType: "image/png" });
      const og = await anonymous.request.get(`/discover/${slug}/opengraph-image`);
      expect(og.ok()).toBe(true);
      expect(og.headers()["content-type"]).toContain("image/png");
      const ogBytes = await og.body();
      const decoded = await sharp(ogBytes).metadata();
      expect([decoded.format, decoded.width, decoded.height]).toEqual(["png", 1200, 630]);
      await testInfo.attach("opengraph-preview", { body: ogBytes, contentType: "image/png" });
      await publicPage.goto("/");
      expect(await publicPage.locator(`a[href="/discover/${slug}"]`).count(), "The published story must appear in the public feed").toBeGreaterThan(0);
      report.stages.push("studio-publication-audit-public-cover-og-and-feed");
    });

    await test.step("unpublish through Studio and verify public removal", async () => {
      await unpublish(page, candidateId!, `Staging smoke complete: ${runName}`);
      const story = checked("Load unpublished story", await database.from("stories").select("lifecycle, published_at").eq("slug", slug).single());
      expect(story.lifecycle).toBe("reviewing");
      expect(story.published_at).toBeNull();
      const events = checked("Load unpublication audit", await database.from("review_events").select("id").eq("cluster_id", candidateId!).eq("action", "unpublish").eq("notes", `Staging smoke complete: ${runName}`));
      expect(events).toHaveLength(1);
      expect((await anonymous.request.get(`/discover/${slug}`)).status(), "A warmed story cache must stop serving the unpublished story").toBe(404);
      await publicPage.goto("/");
      await expect(publicPage.locator(`a[href="/discover/${slug}"]`)).toHaveCount(0);
      report.stages.push("studio-unpublish-audit-and-public-cache-removal");
    });
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    throw error;
  } finally {
    if (publicationAttempted && candidateId) {
      try {
        const story = await database.from("stories").select("lifecycle").eq("slug", slug).maybeSingle();
        if (story.error) throw new Error("Could not verify final story state");
        if (story.data?.lifecycle.startsWith("published_")) {
          await unpublish(page, candidateId, `Staging smoke failure cleanup: ${runName}`);
          report.stages.push("failure-cleanup-unpublished");
        }
      } catch { report.cleanupErrors.push("Could not unpublish the test story; inspect its recorded URL and candidate in Studio"); }
    }
    if (sourceCreated) {
      try {
        await page.goto("/studio/sources");
        const pause = page.getByRole("button", { name: `Pause ${sourceName}`, exact: true });
        if (await pause.count()) {
          await pause.click();
          await expect(page).toHaveURL(/notice=source-paused/);
        }
        await expect(page.getByRole("button", { name: `Activate ${sourceName}`, exact: true })).toBeVisible();
        report.stages.push("test-source-paused");
      } catch { report.cleanupErrors.push("Could not pause the test RSS source; find it by this run name in Studio"); }
    }
    if (report.cleanupErrors.length) report.status = "failed";
    report.finishedAt = new Date().toISOString();
    const reportPath = testInfo.outputPath("release-evidence.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await testInfo.attach("release-evidence", { path: reportPath, contentType: "application/json" });
    await anonymous.close();
    expect(report.cleanupErrors, "Test cleanup must complete before the release run passes").toEqual([]);
  }
});
