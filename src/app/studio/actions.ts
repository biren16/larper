"use server";

import { redirect } from "next/navigation";
import { createEditorialActions } from "@/backend/editorial/actions";
import { getEditorialRuntime } from "@/backend/editorial/runtime";
import { invalidatePublicDiscovery } from "@/backend/editorial/cache-invalidation";
import { isPublicSourceUrl } from "@/backend/ingestion/source-url";

export async function publishCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString(), invalidatePublicContent: invalidatePublicDiscovery });
  const result = form.get("format") === "brief" ? await actions.publishBrief(form) : await actions.publishStory(form);
  if (!result.ok) redirect(`/studio/candidates/${encodeURIComponent(String(form.get("candidateId") ?? ""))}?error=${encodeURIComponent(result.error)}`);
  redirect("/studio");
}

export async function scheduleCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const discoveryType = String(form.get("discoveryType") ?? "TREND") as import("@/domain/discovery/types").DiscoveryType;
  const mode = String(form.get("mode") ?? "current") as import("@/domain/discovery/types").TopicMode;
  if (!new Set(["DROP", "LORE", "MEME", "TREND", "DEBATE", "COMEBACK", "PRODUCT", "EVENT", "PERSON", "AESTHETIC", "DRAMA", "RABBIT_HOLE"]).has(discoveryType) || !new Set(["current", "deep-lore"]).has(mode)) redirect("/studio?error=Invalid+story+classification");
  const values = (key: string) => String(form.get(key) ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const scheduleInput = String(form.get("scheduledFor") ?? "").trim();
  const scheduledFor = scheduleInput && !/(?:Z|[+-]\d\d:\d\d)$/.test(scheduleInput) ? `${scheduleInput}:00+05:30` : scheduleInput;
  try {
    await runtime.service.scheduleStory(runtime.actor, String(form.get("candidateId") ?? ""), {
      nicheId: String(form.get("nicheId") ?? ""), slug: String(form.get("slug") ?? ""), title: String(form.get("title") ?? ""),
      hook: String(form.get("hook") ?? ""), summary: String(form.get("summary") ?? ""), whyItMatters: String(form.get("whyItMatters") ?? ""),
      lore: String(form.get("lore") ?? ""), beginnerContext: String(form.get("beginnerContext") ?? ""), discoveryType, mode,
      regions: values("regions"), freshnessLabel: String(form.get("freshnessLabel") ?? ""), evidenceSummary: String(form.get("evidenceSummary") ?? ""), tags: values("tags"),
    }, scheduledFor, new Date().toISOString());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not schedule story";
    redirect(`/studio/candidates/${encodeURIComponent(String(form.get("candidateId") ?? ""))}?error=${encodeURIComponent(message)}`);
  }
  redirect("/studio");
}

export async function addManualSignalAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const definition = await runtime.client.from("source_definitions").select("id").eq("adapter_type", "manual").eq("active", true).limit(1).maybeSingle();
  if (definition.error || !definition.data) redirect("/studio?error=Create+an+active+manual+source+first");
  form.set("sourceDefinitionId", definition.data.id);
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString() });
  const result = await actions.addManualSignal(form);
  if (!result.ok) redirect(`/studio?error=${encodeURIComponent(result.error)}`);
  redirect("/studio");
}

export async function createSourceAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const adapterType = String(form.get("adapterType") ?? "");
  const trustTier = String(form.get("trustTier") ?? "");
  const locator = String(form.get("locator") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  if (!name || !locator) redirect("/studio?error=Source+name+and+locator+are+required");
  if (!new Set(["rss", "youtube"]).has(adapterType) || !new Set(["primary", "publication", "community", "watchlist"]).has(trustTier)) redirect("/studio?error=Invalid+source+settings");
  let config: Record<string, string>;
  if (adapterType === "rss") {
    if (!isPublicSourceUrl(locator)) redirect("/studio?error=Enter+a+public+feed+URL");
    config = { url: new URL(locator).toString() };
  } else {
    config = locator.startsWith("UC") ? { channelId: locator } : { query: locator };
  }
  const result = await runtime.client.from("source_definitions").insert({
    name, adapter_type: adapterType, trust_tier: trustTier,
    config, locale: String(form.get("locale") ?? "en-IN").trim(), region: String(form.get("region") ?? "india").trim(),
    poll_minutes: 180, allowlisted: form.get("allowlisted") === "on", active: false,
  });
  if (result.error) redirect(`/studio?error=${encodeURIComponent(result.error.message)}`);
  redirect("/studio");
}

export async function toggleSourceAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const sourceId = String(form.get("sourceId") ?? "");
  const active = form.get("active") === "true";
  const result = await runtime.client.from("source_definitions").update({ active, updated_at: new Date().toISOString() }).eq("id", sourceId);
  if (result.error) redirect(`/studio?error=${encodeURIComponent(result.error.message)}`);
  redirect("/studio");
}

export async function transitionCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString(), invalidatePublicContent: invalidatePublicDiscovery });
  const result = await actions.transition(form);
  if (!result.ok) redirect(`/studio/candidates/${encodeURIComponent(String(form.get("candidateId") ?? ""))}?error=${encodeURIComponent(result.error)}`);
  redirect("/studio");
}

export async function mergeCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString() });
  const result = await actions.merge(form);
  if (!result.ok) redirect(`/studio/candidates/${encodeURIComponent(String(form.get("targetId") ?? ""))}?error=${encodeURIComponent(result.error)}`);
  redirect("/studio");
}

export async function splitCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString() });
  const result = await actions.split(form);
  if (!result.ok) redirect(`/studio/candidates/${encodeURIComponent(String(form.get("clusterId") ?? ""))}?error=${encodeURIComponent(result.error)}`);
  redirect("/studio");
}
