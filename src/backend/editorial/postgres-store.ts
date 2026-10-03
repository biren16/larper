import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/data/postgres/database.types";
import { sourceOriginKey } from "@/backend/ingestion/source-catalog";
import type { NormalizedSignal, SourceDefinition } from "@/backend/ingestion/types";
import type { CandidateRecord } from "./types";
import type { EditorialStore, PublicationCommand, ReviewEvent, DraftCommand } from "./service";

function failure(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class PostgresEditorialStore implements EditorialStore {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async createWorkingStory(reviewerId: string) {
    const result=await this.client.rpc("create_editorial_working_story", { p_reviewer_id: reviewerId });
    failure("Create story",result.error); if (!result.data) throw new Error("No candidate returned"); return result.data;
  }
  async commitStarterDraft(command: { reviewerId: string; starter: import("./starters").StarterDraft }) {
    const result = await this.client.rpc("prepare_starter_draft", { p_reviewer_id: command.reviewerId, p_starter: command.starter as unknown as Json });
    failure("Prepare starter draft", result.error);
    if (!result.data) throw new Error("Prepare starter draft: no candidate returned");
    return result.data;
  }

  async getCandidate(id: string): Promise<CandidateRecord | null> {
    const cluster = await this.client.from("topic_clusters").select("*").eq("id", id).maybeSingle();
    failure("Load candidate", cluster.error);
    if (!cluster.data) return null;
    const links = await this.client.from("cluster_signals").select("raw_signal_id").eq("cluster_id", id);
    failure("Load candidate links", links.error);
    const signalIds = (links.data ?? []).map((row) => row.raw_signal_id);
    const signals = signalIds.length ? await this.client.from("raw_signals").select("id, source_definition_id, trust_tier, availability").in("id", signalIds) : { data: [], error: null };
    failure("Load candidate evidence", signals.error);
    const definitionIds = [...new Set((signals.data ?? []).map((row) => row.source_definition_id))];
    const definitions = definitionIds.length ? await this.client.from("source_definitions").select("id, allowlisted, config").in("id", definitionIds) : { data: [], error: null };
    failure("Load evidence definitions", definitions.error);
    const allowlisted = new Map((definitions.data ?? []).map((row) => [row.id, row.allowlisted]));
    const origins = new Map((definitions.data ?? []).map((row) => [row.id, sourceOriginKey(row)]));
    return {
      id: cluster.data.id, title: cluster.data.title, nicheId: cluster.data.niche_id,
      state: cluster.data.state as CandidateRecord["state"], heat: Number(cluster.data.heat), confidence: Number(cluster.data.confidence),
      sensitiveFlags: cluster.data.sensitive_flags,
      evidence: (signals.data ?? []).map((row) => ({ id: row.id, sourceDefinitionId: row.source_definition_id, originKey: origins.get(row.source_definition_id), trustTier: row.trust_tier as CandidateRecord["evidence"][number]["trustTier"], availability: row.availability as CandidateRecord["evidence"][number]["availability"], allowlisted: allowlisted.get(row.source_definition_id) ?? false })),
    };
  }

  async commitPublication(command: PublicationCommand) {
    if (command.expectedVersion !== undefined) return this.approveVersion(command);
    const result = await this.client.rpc("publish_editorial_story", {
      p_candidate_id: command.candidateId, p_reviewer_id: command.reviewerId,
      p_lifecycle: command.lifecycle, p_publication_format: command.publicationFormat,
      p_draft: command.draft as unknown as Json,
    });
    failure("Publish story", result.error);
    const row = result.data?.[0];
    if (!row) throw new Error("Publish story: no revision returned");
    return { storyId: row.story_id, revision: row.revision };
  }
  async schedulePublication(command: PublicationCommand & { scheduledFor: string }) {
    if (command.expectedVersion !== undefined) return this.approveVersion(command, command.scheduledFor);
    const result = await this.client.rpc("schedule_editorial_story", {
      p_candidate_id: command.candidateId, p_reviewer_id: command.reviewerId,
      p_draft: command.draft as unknown as Json, p_scheduled_for: command.scheduledFor,
    });
    failure("Schedule story", result.error);
    const row = result.data?.[0];
    if (!row) throw new Error("Schedule story: no revision returned");
    return { storyId: row.story_id, revision: row.revision };
  }
  private async approveVersion(command: PublicationCommand, scheduledFor?: string) {
    const result = await this.client.rpc("approve_editorial_version", {
      p_candidate_id: command.candidateId, p_reviewer_id: command.reviewerId, p_draft: command.draft as unknown as Json,
      p_expected_version: command.expectedVersion!, p_format: command.publicationFormat,
      ...(command.workingDraft ? {p_working_draft: command.workingDraft as unknown as Json} : {}),
      ...(scheduledFor ? { p_scheduled_for: scheduledFor, p_operation: "schedule" } : {}),
    });
    failure("Approve version", result.error);
    const row = result.data?.[0];
    if (!row) throw new Error("Approve version: no revision returned");
    return { storyId: row.story_id, revision: row.revision };
  }
  async changeSchedule(command: DraftCommand & { operation: "cancel_schedule" | "update_schedule" }) {
    const result = await this.client.rpc("approve_editorial_version", {
      p_candidate_id: command.candidateId, p_reviewer_id: command.reviewerId, p_draft: command.draft as unknown as Json,
      p_expected_version: command.expectedVersion!, p_format: "story", p_operation: command.operation,
    });
    failure("Change schedule", result.error);
    const row = result.data?.[0]; if (!row) throw new Error("Change schedule: no version returned");
    return { storyId: row.story_id, revision: row.revision };
  }
  async recordReview(event: ReviewEvent) {
    const result = await this.client.from("review_events").insert({ cluster_id: event.candidateId, reviewer_id: event.reviewerId, action: event.action, notes: event.notes ?? null });
    failure("Record review", result.error);
  }
  async setCandidateState(id: string, state: CandidateRecord["state"]) {
    const cluster = await this.client.from("topic_clusters").update({ state, updated_at: new Date().toISOString() }).eq("id", id);
    failure("Update candidate", cluster.error);
    if (state === "reviewing") {
      const story = await this.client.from("stories").update({ lifecycle: "reviewing", published_at: null, last_updated_at: new Date().toISOString() }).eq("cluster_id", id);
      failure("Unpublish story", story.error);
    }
  }
  async commitTransition(event: ReviewEvent & { state: CandidateRecord["state"] }) {
    const result = await this.client.rpc(event.expectedVersion === undefined ? "transition_editorial_candidate" : "transition_editorial_version", {
      ...(event.expectedVersion === undefined ? {} : { p_expected_version: event.expectedVersion }),
      p_candidate_id: event.candidateId, p_reviewer_id: event.reviewerId,
      p_state: event.state, p_action: event.action, p_notes: event.notes ?? "",
    });
    failure("Transition candidate", result.error);
  }
  async mergeClusters(targetId: string, sourceId: string, reviewerId: string) {
    const result = await this.client.rpc("merge_editorial_clusters", { p_target_id: targetId, p_source_id: sourceId, p_reviewer_id: reviewerId });
    failure("Merge evidence", result.error);
  }
  async splitCluster(clusterId: string, signalIds: string[], reviewerId: string) {
    const result = await this.client.rpc("split_editorial_cluster", { p_cluster_id: clusterId, p_signal_ids: signalIds, p_reviewer_id: reviewerId });
    failure("Split evidence", result.error);
    if (!result.data) throw new Error("Split evidence: no candidate returned");
    return result.data;
  }
  async getSourceDefinition(id: string): Promise<SourceDefinition | null> {
    const result = await this.client.from("source_definitions").select("*").eq("id", id).maybeSingle();
    failure("Load registered source", result.error);
    const row = result.data;
    if (!row) return null;
    return { id: row.id, name: row.name, adapterType: row.adapter_type as SourceDefinition["adapterType"],
      trustTier: row.trust_tier as SourceDefinition["trustTier"], locale: row.locale, region: row.region,
      allowlisted: row.allowlisted, config: row.config as Record<string, unknown> };
  }

  async commitDraft(command: DraftCommand) {
    const result = await this.client.rpc("save_editorial_working_draft", {
      p_expected_version: command.expectedVersion ?? 0,
      p_candidate_id: command.candidateId, p_reviewer_id: command.reviewerId,
      p_draft: command.draft as unknown as Json,
    });
    failure("Save draft", result.error);
    const row = result.data?.[0];
    if (!row) throw new Error("Save draft: no revision returned");
    return { storyId: row.story_id, revision: row.revision };
  }

  async addManualSignal(signal: NormalizedSignal) {
    const result = await this.client.rpc("record_manual_signal", { p_source_id: signal.sourceDefinitionId, p_signal: signal as unknown as Json });
    failure("Add manual signal", result.error);
    if (!result.data) throw new Error("Add manual signal: no signal returned");
    return result.data;
  }
}
