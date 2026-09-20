"use server";

import { redirect } from "next/navigation";
import { createEditorialActions } from "@/backend/editorial/actions";
import { getEditorialRuntime } from "@/backend/editorial/runtime";
import { invalidatePublicDiscovery } from "@/backend/editorial/cache-invalidation";

export async function publishCandidateAction(form: FormData) {
  const runtime = await getEditorialRuntime();
  const actions = createEditorialActions({ service: runtime.service, getActor: async () => runtime.actor, now: () => new Date().toISOString(), invalidatePublicContent: invalidatePublicDiscovery });
  const result = form.get("format") === "brief" ? await actions.publishBrief(form) : await actions.publishStory(form);
  if (!result.ok) redirect(`/studio/candidates/${encodeURIComponent(String(form.get("candidateId") ?? ""))}?error=${encodeURIComponent(result.error)}`);
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
