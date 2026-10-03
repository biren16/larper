"use server";

import { redirect } from "next/navigation";
import { createEditorialActions, storyDraftFromForm, editorialDate, editorialVersionFromForm } from "@/backend/editorial/actions";
import { getEditorialRuntime } from "@/backend/editorial/runtime";
import { invalidatePublicDiscovery } from "@/backend/editorial/cache-invalidation";
import { CULTURE_BEATS, CULTURE_SOURCE_PRESETS, hasUsageReview, validateUsageReview } from "@/backend/ingestion/source-catalog";
import type { Json } from "@/data/postgres/database.types";
import { isSocialCreatorDomain, validateCreatorProfile } from "@/backend/ingestion/creator-profile";
import { isPublicSourceUrl } from "@/backend/ingestion/source-url";
import { validateEditorialUpload, validateMediaRights } from "@/backend/media/upload";

export async function uploadEditorialMediaAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const candidateId = String(form.get("candidateId") ?? "").trim();

  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId)) throw new Error("A valid candidate is required");
    const file = form.get("image");
    if (!(file instanceof File)) throw new Error("Image file is required");
    const { bytes, width, height } = await validateEditorialUpload(file);
    const rights = validateMediaRights({
      alt: String(form.get("alt") ?? ""), sourceUrl: String(form.get("sourceUrl") ?? ""),
      creditLine: String(form.get("creditLine") ?? ""), licenseCode: String(form.get("licenseCode") ?? ""),
      commercialUseAllowed: form.get("commercialUseAllowed") === "on",
      modificationAllowed: form.get("modificationAllowed") === "on",
      socialUseAllowed: form.get("socialUseAllowed") === "on",
    });
    const id = crypto.randomUUID();
    const objectPath = `${candidateId}/${id}.webp`;
    const bucket = runtime.client.storage.from("editorial-media");
    const saved = await bucket.upload(objectPath, bytes, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (saved.error) throw new Error(`Image upload failed: ${saved.error.message}`);
    const { data: publicUrl } = bucket.getPublicUrl(objectPath);
    const recorded = await runtime.client.from("media_assets").insert({
      id, src: publicUrl.publicUrl, alt: rights.alt, width, height, focal_position: null,
      kind: "uploaded", source_url: rights.sourceUrl, credit_line: rights.creditLine,
      license_code: rights.licenseCode, commercial_use_allowed: rights.commercialUseAllowed,
      modification_allowed: rights.modificationAllowed, social_use_allowed: rights.socialUseAllowed,
      object_path: objectPath,
    });
    if (recorded.error) {
      await bucket.remove([objectPath]);
      throw new Error(`Image record failed: ${recorded.error.message}`);
    }
    return { ok: true as const, mediaId: id };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not upload image" };
  }
}

export async function saveCandidateDraftAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString() });
  return actions.saveDraft(form);
}

export async function publishCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString(), invalidatePublicContent: invalidatePublicDiscovery });
  const isBrief = form.get("format") === "brief";
  const result = isBrief ? await actions.publishBrief(form) : await actions.publishStory(form);
  return { ...result, ...(!result.ok ? { conflict: result.error.includes("EDITORIAL_CONFLICT") } : { destination: `/studio?notice=${isBrief ? "brief-published" : "story-published"}` }) };
}

export async function scheduleCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  try {
    const version = editorialVersionFromForm(form);
    if (version === undefined) throw new Error("Editorial version is required");
    const candidateId = String(form.get("candidateId") ?? "");
    const operation = String(form.get("intent") ?? "schedule");
    const draft = storyDraftFromForm(form, operation === "cancel_schedule");
    const result = operation === "cancel_schedule" || operation === "update_schedule"
      ? await runtime.service.changeSchedule(runtime.actor, candidateId, draft, version, operation)
      : await runtime.service.scheduleStory(runtime.actor, candidateId, draft, editorialDate(String(form.get("scheduledFor") ?? "")), new Date().toISOString(), version);
    const notice = operation === "cancel_schedule" ? "schedule-cancelled" : operation === "update_schedule" ? "scheduled-version-updated" : "story-scheduled";
    return { ok: true as const, revision: result.revision, workingPersisted: true as const, destination: `/studio?notice=${notice}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not schedule story";
    return { ok: false as const, error: message, conflict: message.includes("EDITORIAL_CONFLICT") };
  }
}

export async function addManualSignalAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  let sourceId = String(form.get("sourceDefinitionId") ?? "").trim();
  if (!sourceId) {
    let profile;
    try {
      if (form.get("creatorOwnershipConfirmed") !== "on") throw new Error("Confirm the post belongs to this creator profile");
      profile = validateCreatorProfile(String(form.get("creatorProfileUrl") ?? ""));
      if (!String(form.get("sourceName") ?? "").trim()) throw new Error("Creator name is required");
    } catch (error) {
      redirect(`/studio?error=${encodeURIComponent(error instanceof Error ? error.message : "Invalid creator profile")}`);
    }
    const creator = await runtime.client.rpc("register_manual_creator", { p_profile_url: profile.profileUrl, p_domain: profile.domain, p_name: String(form.get("sourceName")).trim() });
    if (creator.error || !creator.data) redirect(`/studio?error=${encodeURIComponent(creator.error?.message ?? "Could not register creator")}`);
    sourceId = creator.data;
    form.set("sourceDefinitionId", sourceId);
  }
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString() });
  const result = await actions.addManualSignal(form);
  if (!result.ok) redirect(`/studio?error=${encodeURIComponent(result.error)}`);
  const processed = await runtime.client.rpc("process_unclustered_signals");
  if (processed.error) redirect("/studio?error=Signal+saved%2C+but+could+not+refresh+the+queue");
  redirect("/studio?notice=signal-added");
}

export async function createSourceAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const adapterType = String(form.get("adapterType") ?? "");
  const trustTier = String(form.get("trustTier") ?? "");
  const locator = String(form.get("locator") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const watchlistBeat = String(form.get("watchlistBeat") ?? "").trim();
  if (!name || !locator) redirect("/studio/sources?error=Source+name+and+locator+are+required");
  if (!new Set(["rss", "youtube", "manual"]).has(adapterType) || !new Set(["primary", "publication", "community", "watchlist"]).has(trustTier)) redirect("/studio/sources?error=Invalid+source+settings");
  if (!new Set<string>(CULTURE_BEATS.map((beat) => beat.id)).has(watchlistBeat)) redirect("/studio/sources?error=Choose+a+valid+watchlist+beat");
  let config: Record<string, Json | undefined>;
  if (adapterType === "rss" || adapterType === "manual") {
    if (!isPublicSourceUrl(locator)) redirect("/studio/sources?error=Enter+a+public+feed+URL");
    const url = new URL(locator);
    const domain = url.hostname.toLowerCase().replace(/^www\./, "");
    if (isSocialCreatorDomain(domain)) redirect("/studio/sources?error=Register+social+creator+profiles+through+manual+capture");
    config = { url: url.toString(), owner: name, originKey: `publisher:${domain}`, domains: [domain] };
  } else {
    config = locator.startsWith("UC") ? { channelId: locator } : { query: locator };
  }
  const result = await runtime.client.from("source_definitions").insert({
    name, adapter_type: adapterType, trust_tier: trustTier,
    config, locale: String(form.get("locale") ?? "en").trim(), region: String(form.get("region") ?? "global").trim(),
    poll_minutes: 180, allowlisted: form.get("allowlisted") === "on", active: false, watchlist_beat: watchlistBeat,
  });
  if (result.error) redirect(`/studio/sources?error=${encodeURIComponent(result.error.message)}`);
  redirect("/studio/sources?notice=source-added");
}

export async function toggleSourceAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const sourceId = String(form.get("sourceId") ?? "");
  const active = form.get("active") === "true";
  if (active) {
    const source = await runtime.client.from("source_definitions").select("config, adapter_type").eq("id", sourceId).maybeSingle();
    if (source.error || !source.data) redirect("/studio/sources?error=Source+not+found");
    if (source.data.adapter_type === "manual") redirect("/studio/sources?error=Manual+references+do+not+need+polling");
    if (!hasUsageReview(source.data.config)) redirect("/studio/sources?error=Record+a+usage+review+before+activation");
  }
  const result = await runtime.client.from("source_definitions").update({ active, updated_at: new Date().toISOString() }).eq("id", sourceId);
  if (result.error) redirect(`/studio/sources?error=${encodeURIComponent(result.error.message)}`);
  redirect(`/studio/sources?notice=${active ? "source-activated" : "source-paused"}`);
}

export async function transitionCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString(), invalidatePublicContent: invalidatePublicDiscovery });
  const result = await actions.transition(form);
  if (!result.ok) return result;
  const notice = form.get("action") === "reject" ? "candidate-rejected" : form.get("action") === "expire" ? "candidate-expired" : "story-unpublished";
  return { ok: true as const, destination: `/studio?notice=${notice}` };
}

export async function mergeCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString() });
  const result = await actions.merge(form);
  if (!result.ok) redirect(`/studio/candidates/${encodeURIComponent(String(form.get("targetId") ?? ""))}?error=${encodeURIComponent(result.error)}`);
  redirect("/studio?notice=clusters-merged");
}

export async function splitCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString() });
  const result = await actions.split(form);
  if (!result.ok) redirect(`/studio/candidates/${encodeURIComponent(String(form.get("clusterId") ?? ""))}?error=${encodeURIComponent(result.error)}`);
  redirect("/studio?notice=cluster-split");
}

export async function registerSourcePresetsAction() {
  const runtime = await getEditorialRuntime();
  const result = await runtime.client.rpc("register_culture_sources", { p_presets: CULTURE_SOURCE_PRESETS as unknown as Json });
  if (result.error) redirect(`/studio/sources?error=${encodeURIComponent(result.error.message)}`);
  redirect("/studio/sources?notice=sources-registered");
}

export async function reviewSourceUsageAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const sourceId = String(form.get("sourceId") ?? "");
  let review;
  try {
    review = validateUsageReview({ termsUrl: String(form.get("termsUrl") ?? ""), basis: String(form.get("basis") ?? ""), notes: String(form.get("notes") ?? "") }, runtime.actor.id, new Date().toISOString());
  } catch (error) {
    redirect(`/studio/sources?error=${encodeURIComponent(error instanceof Error ? error.message : "Invalid usage review")}`);
  }
  const source = await runtime.client.from("source_definitions").select("config").eq("id", sourceId).maybeSingle();
  if (source.error || !source.data) redirect("/studio/sources?error=Source+not+found");
  const config = source.data.config && typeof source.data.config === "object" && !Array.isArray(source.data.config) ? source.data.config : {};
  const result = await runtime.client.from("source_definitions").update({ config: { ...config, usageReview: review }, updated_at: new Date().toISOString() }).eq("id", sourceId);
  if (result.error) redirect(`/studio/sources?error=${encodeURIComponent(result.error.message)}`);
  redirect("/studio/sources?notice=usage-reviewed");
}

export async function prepareStarterDraftAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  let candidateId;
  try {
    candidateId = await runtime.service.prepareStarterDraft(runtime.actor, String(form.get("starterKey") ?? ""), form.get("receiptsChecked") === "on");
  } catch (error) {
    redirect(`/studio/starters?error=${encodeURIComponent(error instanceof Error ? error.message : "Could not prepare starter draft")}`);
  }
  redirect(`/studio/candidates/${encodeURIComponent(candidateId)}?notice=draft-saved`);
}

export async function createPrivateStoryAction() {
 const runtime=await getEditorialRuntime();
 const id=await runtime.service.createWorkingStory(runtime.actor);
 redirect(`/studio/candidates/${id}`);
}
