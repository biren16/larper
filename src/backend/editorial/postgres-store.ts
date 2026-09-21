import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/data/postgres/database.types";
import type { NormalizedSignal } from "@/backend/ingestion/types";
import type { CandidateRecord } from "./types";
import type { EditorialStore, PublicationCommand, ReviewEvent } from "./service";

function failure(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class PostgresEditorialStore implements EditorialStore {
  constructor(private readonly client: SupabaseClient<Database>) {}

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
    const definitions = definitionIds.length ? await this.client.from("source_definitions").select("id, allowlisted").in("id", definitionIds) : { data: [], error: null };
    failure("Load evidence definitions", definitions.error);
    const allowlisted = new Map((definitions.data ?? []).map((row) => [row.id, row.allowlisted]));
    return {
      id: cluster.data.id, title: cluster.data.title, nicheId: cluster.data.niche_id,
      state: cluster.data.state as CandidateRecord["state"], heat: Number(cluster.data.heat), confidence: Number(cluster.data.confidence),
      sensitiveFlags: cluster.data.sensitive_flags,
      evidence: (signals.data ?? []).map((row) => ({ id: row.id, sourceDefinitionId: row.source_definition_id, trustTier: row.trust_tier as CandidateRecord["evidence"][number]["trustTier"], availability: row.availability as CandidateRecord["evidence"][number]["availability"], allowlisted: allowlisted.get(row.source_definition_id) ?? false })),
    };
  }

  async commitPublication(command: PublicationCommand) {
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
    const result = await this.client.rpc("schedule_editorial_story", {
      p_candidate_id: command.candidateId, p_reviewer_id: command.reviewerId,
      p_draft: command.draft as unknown as Json, p_scheduled_for: command.scheduledFor,
    });
    failure("Schedule story", result.error);
    const row = result.data?.[0];
    if (!row) throw new Error("Schedule story: no revision returned");
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
  async mergeClusters(targetId: string, sourceId: string) {
    const links = await this.client.from("cluster_signals").select("raw_signal_id, match_score, match_reasons").eq("cluster_id", sourceId);
    failure("Load merge evidence", links.error);
    if (links.data?.length) {
      const merged = await this.client.from("cluster_signals").upsert(links.data.map((row) => ({ ...row, cluster_id: targetId })), { onConflict: "cluster_id,raw_signal_id" });
      failure("Merge evidence", merged.error);
      const removed = await this.client.from("cluster_signals").delete().eq("cluster_id", sourceId);
      failure("Remove duplicate links", removed.error);
    }
    await this.setCandidateState(sourceId, "rejected");
  }
  async splitCluster(clusterId: string, signalIds: string[]) {
    const source = await this.client.from("topic_clusters").select("*").eq("id", clusterId).single();
    failure("Load split candidate", source.error);
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...copy } = source.data!;
    void _id; void _createdAt; void _updatedAt;
    const created = await this.client.from("topic_clusters").insert({ ...copy, title: `${copy.title} (split)`, state: "reviewing" }).select("id").single();
    failure("Create split candidate", created.error);
    const moved = await this.client.from("cluster_signals").update({ cluster_id: created.data!.id }).eq("cluster_id", clusterId).in("raw_signal_id", signalIds);
    failure("Move split evidence", moved.error);
    return created.data!.id;
  }
  async addManualSignal(signal: NormalizedSignal) {
    const result = await this.client.from("raw_signals").upsert({
      source_definition_id: signal.sourceDefinitionId, canonical_url: signal.canonicalUrl, external_id: signal.externalId ?? null,
      source_type: signal.sourceType, source_name: signal.sourceName, author: signal.author ?? null, title: signal.title,
      body: signal.body ?? null, locale: signal.locale, region: signal.region, suggested_niche_id: signal.suggestedNicheId ?? null, published_at: signal.publishedAt,
      observed_at: signal.observedAt, trust_tier: signal.trustTier, availability: signal.availability,
      metrics: signal.metrics, sensitive_flags: signal.sensitiveFlags,
    }, { onConflict: "source_definition_id,canonical_url" }).select("id").single();
    failure("Add manual signal", result.error);
    return result.data!.id;
  }
}
