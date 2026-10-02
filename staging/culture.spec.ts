import { readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../src/data/postgres/database.types";
import { SEVEN_LANE_STARTERS } from "../src/backend/editorial/starters";
import { CULTURE_SOURCE_PRESETS } from "../src/backend/ingestion/source-catalog";
import { cultureManualCaptures } from "./manual-captures";
import type { SourceDefinition } from "../src/backend/ingestion/types";
import { hasUsageReview } from "../src/backend/ingestion/source-review";
import { assertSourceRegistryMatches, readCultureStagingInput, readStagingConfig } from "./config";

const config = readStagingConfig(process.env);
readCultureStagingInput(JSON.parse(readFileSync(config.inputFile, "utf8")));
function checked<T>(operation: string, result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error || result.data === null) throw new Error(`${operation} failed; inspect isolated staging`);
  return result.data as NonNullable<T>;
}
function record(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

test("seven real lanes, deployed feeds, scheduled collection and public removal", async ({ page, browser }, testInfo) => {
  const database = createClient<Database>(config.supabaseUrl, config.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const anonymous = await browser.newContext({ baseURL: config.appUrl, storageState: { cookies: [], origins: [] } });
  const publicPage = await anonymous.newPage();
  const report = { startedAt: new Date().toISOString(), status: "running", feeds: [] as unknown[], schedule: {} as unknown, lanes: [] as unknown[], failures: [] as string[] };
  const published = new Map<string, string>();
  async function remove(candidateId: string) {
    await page.goto(`/studio/candidates/${candidateId}`);
    await page.getByText("More actions", { exact: true }).click();
    await page.getByLabel("Review note").fill("Seven-lane staging verification complete; retain private draft for founder review");
    await page.getByRole("button", { name: "Unpublish", exact: true }).click();
    await expect(page).toHaveURL(/notice=story-unpublished/);
  }
  try {
    await test.step("verify founder access and the deployed database identity", async () => {
      await page.goto("/studio/sources");
      await expect(page.getByRole("heading", { name: "Watchlists", exact: true })).toBeVisible();
      await publicPage.goto("/studio");
      await expect(publicPage).toHaveURL(/\/auth\?next=/);
      const registry = checked("Read source registry", await database.from("source_definitions").select("id").in("adapter_type", ["rss", "youtube"]));
      const ids = await page.locator('input[name="sourceId"]').evaluateAll((elements) => elements.map((element) => (element as HTMLInputElement).value));
      assertSourceRegistryMatches(ids, registry.map((row) => row.id));
      for (let attempt = 0; attempt < 2; attempt++) {
        await page.getByRole("button", { name: "Register seven-lane sources", exact: true }).click();
        await expect(page).toHaveURL(/notice=sources-registered/);
      }
    });
    await test.step("verify all 21 deployed feeds and an actual scheduled cycle", async () => {
      // The operator first records usage reviews and allows the real three-hour job
      // to run. Fixtures and a manually labelled cron request cannot pass this gate.
      const sources = checked("Read registered presets", await database.from("source_definitions").select("id,name,config,active,last_polled_at").in("adapter_type", ["rss", "manual"]));
      const feeds = CULTURE_SOURCE_PRESETS.filter((preset) => preset.adapterType === "rss").map((preset) => {
        const source = sources.find((row) => record(row.config).presetKey === preset.key);
        expect(source, `Missing preset ${preset.key}`).toBeTruthy();
        return { preset, source: source! };
      });
      const failures = checked("Read source failures", await database.from("source_failures").select("source_definition_id,message").is("resolved_at", null));
      report.feeds = feeds.map(({ preset, source }) => ({ key: preset.key, sourceId: source.id, active: source.active, reviewed: hasUsageReview(source.config), lastPolledAt: source.last_polled_at, failures: failures.filter((failure) => failure.source_definition_id === source.id).map((failure) => failure.message) }));
      for (const { preset, source } of feeds) {
        expect(hasUsageReview(source.config), `Review usage for ${preset.name} before collection`).toBe(true);
        expect(source.active, `Activate reviewed ${preset.name} on isolated staging`).toBe(true);
        expect(source.last_polled_at, `No deployed collection evidence for ${preset.name}`).toBeTruthy();
        const signals = checked("Read collected feed evidence", await database.from("raw_signals").select("id").eq("source_definition_id", source.id).limit(1));
        expect(signals.length, `${preset.name} must yield real evidence`).toBeGreaterThan(0);
        expect(failures.filter((failure) => failure.source_definition_id === source.id), `${preset.name} has a restricted or failed collection`).toEqual([]);
      }
      const schedule = record(checked("Read schedule evidence", await database.rpc("ingestion_schedule_evidence")));
      report.schedule = schedule;
      expect(schedule.schedule).toBe("0 */3 * * *");
      expect(schedule.active).toBe(true);
      const cycle = record(schedule.latestRun ?? null);
      expect(cycle.status).toBe("succeeded");
      const started = String(cycle.startedAt ?? "");
      expect(Date.now() - Date.parse(started), "An actual scheduled cycle must have completed in the last 3.5 hours").toBeLessThan(3.5 * 60 * 60_000);
      const runs = checked("Read scheduled deployed ingestion", await database.from("ingestion_runs").select("id,status,started_at,details").eq("trigger", "supabase_cron").gte("started_at", started).lte("started_at", new Date(Date.parse(started) + 5 * 60_000).toISOString()));
      const run = runs.find((row) => feeds.every(({ source }) => (record(row.details).sourceIds as Json[] | undefined)?.includes(source.id)));
      expect(run, "The scheduler must actually attempt every reviewed feed; wait for the next cycle after activation").toBeTruthy();
      expect(run!.status).toBe("succeeded");
      await page.goto("/studio/sources");
      for (const { preset } of feeds) await expect(page.locator("article").filter({ has: page.getByRole("heading", { name: feeds.find((item) => item.preset.key === preset.key)!.source.name, exact: true }) }).locator('[data-status="live"]')).toBeVisible();
    });
    for (const starter of SEVEN_LANE_STARTERS) await test.step(`${starter.key}: intake, review, draft, public cover and cache removal`, async () => {
      const registered = checked("Read manual publisher identities", await database.from("source_definitions").select("id,name,adapter_type,trust_tier,locale,region,allowlisted,config"));
      const sources: SourceDefinition[] = registered.map((row) => {
        const adapterType = row.adapter_type; const trustTier = row.trust_tier;
        if (adapterType !== "rss" && adapterType !== "manual" && adapterType !== "youtube") throw new Error("Unsupported registered source adapter");
        if (trustTier !== "primary" && trustTier !== "publication" && trustTier !== "community" && trustTier !== "watchlist") throw new Error("Unsupported registered source trust");
        return { id: row.id, name: row.name, adapterType, trustTier, locale: row.locale, region: row.region,
          allowlisted: row.allowlisted, config: record(row.config) };
      });
      const captures = cultureManualCaptures(starter, sources);
      const captureEvidence = [];
      for (const capture of captures) {
        const before = checked("Read previous receipt", await database.from("raw_signals").select("id,observed_at").eq("source_definition_id", capture.sourceDefinitionId).eq("canonical_url", capture.url));
        await page.goto("/studio");
        const composer = page.getByRole("form", { name: "Add a manual signal" });
        // The desktop composer is visible; on mobile the launcher opens the panel.
        if (!await composer.isVisible()) await page.getByRole("button", { name: "Add signal", exact: true }).click();
        await composer.getByLabel("Public URL", { exact: true }).fill(capture.url);
        await composer.getByLabel("What is moving?").fill(capture.title);
        await composer.getByLabel("Platform", { exact: true }).selectOption("web");
        await composer.getByLabel("Region", { exact: true }).selectOption(capture.region);
        await composer.getByLabel("Registered publisher or creator", { exact: true }).selectOption(capture.sourceDefinitionId);
        await composer.getByLabel("Niche", { exact: true }).selectOption(capture.nicheId);
        await composer.getByLabel("Observation", { exact: true }).fill(starter.originAssessment);
        await composer.getByLabel("Published at", { exact: true }).fill(capture.publishedLocal);
        await composer.getByRole("button", { name: "Add to evidence inbox", exact: true }).click();
        await expect(page).toHaveURL(/notice=signal-added/);
        const signal = checked("Read submitted manual receipt", await database.from("raw_signals").select("id,source_definition_id,source_name,trust_tier,canonical_url,published_at,observed_at").eq("source_definition_id", capture.sourceDefinitionId).eq("canonical_url", capture.url).single());
        expect(signal.source_name).toBe(capture.sourceName);
        expect(signal.trust_tier).toBe(capture.trustTier);
        expect(Date.parse(signal.published_at)).toBe(Date.parse(capture.publishedAt));
        if (before.length) { expect(signal.id).toBe(before[0].id); expect(signal.observed_at).toBe(before[0].observed_at); }
        captureEvidence.push({ ...signal, originKey: capture.originKey });
      }
      await page.goto("/studio/starters");
      const section = page.locator("section").filter({ has: page.getByRole("heading", { name: starter.draft.title, exact: true }) });
      const existing = section.getByRole("link", { name: /Open saved draft/ });
      if (await existing.count()) await existing.click();
      else {
        await section.getByRole("checkbox").check();
        await section.getByRole("button", { name: "Prepare private draft", exact: true }).click();
      }
      await expect(page).toHaveURL(/\/studio\/candidates\//);
      const candidateId = page.url().split("/candidates/")[1].split("?")[0];
      const form = page.getByRole("form", { name: "Story editor" });
      const slug = await form.locator('[name="slug"]').inputValue();
      const title = await form.locator('[name="title"]').inputValue();
      const linked = checked("Read reviewed starter evidence", await database.from("cluster_signals").select("raw_signal_id").eq("cluster_id", candidateId));
      for (const receipt of captureEvidence) expect(linked.map((link) => link.raw_signal_id)).toContain(receipt.id);
      const saved = checked("Read private draft", await database.from("stories").select("id,lifecycle,published_at").eq("cluster_id", candidateId).single());
      expect(saved.lifecycle).toBe("reviewing"); expect(saved.published_at).toBeNull();
      expect((await anonymous.request.get(`/discover/${slug}`)).status()).toBe(404);
      await expect(form.locator('[name="independentSourcesConfirmed"]')).not.toBeChecked();
      await form.getByRole("button", { name: "Save draft", exact: true }).click();
      await expect(page).toHaveURL(/notice=draft-saved/);
      await page.reload();
      await expect(form.locator('[name="title"]')).toHaveValue(title);
      await expect(form.locator('[name="lore"]')).not.toBeEmpty();
      // Source links from the registered publisher capture must be present in review.
      for (const receipt of starter.receipts) await expect(page.locator(`a[href="${receipt.url.replace(/\/$/, "")}"]`)).toHaveCount(1);
      await publicPage.goto(`/niches/${starter.key}`); // warm the shared niche cache
      await expect(publicPage.locator(`a[href="/discover/${slug}"]`)).toHaveCount(0);
      await form.locator('[name="independentSourcesConfirmed"]').check();
      published.set(candidateId, slug);
      await form.getByRole("button", { name: "Publish story", exact: true }).click();
      await expect(page).toHaveURL(/notice=story-published/);
      await publicPage.goto(`/discover/${slug}`);
      await expect(publicPage.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await expect(publicPage.getByTestId("larper-cover").first()).toBeVisible();
      const og = await anonymous.request.get(`/discover/${slug}/opengraph-image`);
      expect(og.ok()).toBe(true); expect(og.headers()["content-type"]).toContain("image/png");
      await publicPage.goto(`/niches/${starter.key}`);
      expect(await publicPage.locator(`a[href="/discover/${slug}"]`).count()).toBeGreaterThan(0);
      if (starter.key === "style") for (const subtopic of ["sneakers", "streetwear"]) {
        await publicPage.goto(`/niches/style?subtopic=${subtopic}`);
        expect(await publicPage.locator(`a[href="/discover/${slug}"]`).count()).toBeGreaterThan(0);
        await expect(publicPage.getByRole("button", { name: /larping in Style/ })).toHaveCount(1);
      }
      await testInfo.attach(`${starter.key}-published`, { body: await publicPage.screenshot({ fullPage: true }), contentType: "image/png" });
      await remove(candidateId);
      published.delete(candidateId);
      expect((await anonymous.request.get(`/discover/${slug}`)).status()).toBe(404);
      for (const path of [`/niches/${starter.key}`, ...(starter.key === "style" ? ["/niches/style?subtopic=sneakers", "/niches/style?subtopic=streetwear"] : [])]) {
        await publicPage.goto(path);
        await expect(publicPage.locator(`a[href="/discover/${slug}"]`)).toHaveCount(0);
      }
      const retained = checked("Read retained founder draft", await database.from("stories").select("lifecycle,published_at").eq("id", saved.id).single());
      expect(retained.lifecycle).toBe("reviewing"); expect(retained.published_at).toBeNull();
      report.lanes.push({ key: starter.key, candidateId, storyId: saved.id, slug, manualReceipts: captureEvidence, status: "passed" });
    });
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.failures.push(error instanceof Error ? error.message : "Verification failed");
    throw error;
  } finally {
    for (const [candidateId, slug] of published) try { await remove(candidateId); } catch { report.failures.push(`Could not remove staging publication /discover/${slug}`); }
    const path = testInfo.outputPath("seven-lane-evidence.json");
    writeFileSync(path, JSON.stringify(report, null, 2));
    await testInfo.attach("seven-lane-evidence", { path, contentType: "application/json" });
    await anonymous.close();
  }
});
