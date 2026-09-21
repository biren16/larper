import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/data/postgres/database.types";
import type { StudioDashboardData } from "@/app/studio/studio-dashboard";
import type { StudioCandidateDetail } from "@/app/studio/candidates/story-editor";

function check(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class StudioReader {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async dashboard(): Promise<StudioDashboardData> {
    const [clusters, niches, sources, failures, runs, links] = await Promise.all([
      this.client.from("topic_clusters").select("id, title, niche_id, heat, confidence, state, editorial_stage, last_checked_at, sensitive_flags").in("state", ["detected", "reviewing"]).order("heat", { ascending: false }).limit(50),
      this.client.from("niches").select("id, name"),
      this.client.from("source_definitions").select("id, name, adapter_type, active, last_polled_at").order("name"),
      this.client.from("source_failures").select("source_definition_id").is("resolved_at", null),
      this.client.from("ingestion_runs").select("id, status, started_at, inserted_count, error_count").order("started_at", { ascending: false }).limit(20),
      this.client.from("cluster_signals").select("cluster_id"),
    ]);
    [clusters, niches, sources, failures, runs, links].forEach((result) => check("Load studio dashboard", result.error));
    const nicheNames = new Map((niches.data ?? []).map((row) => [row.id, row.name]));
    const failureCounts = new Map<string, number>();
    (failures.data ?? []).forEach((row) => failureCounts.set(row.source_definition_id, (failureCounts.get(row.source_definition_id) ?? 0) + 1));
    const signalCounts = new Map<string, number>();
    (links.data ?? []).forEach((row) => signalCounts.set(row.cluster_id, (signalCounts.get(row.cluster_id) ?? 0) + 1));
    return {
      niches: (niches.data ?? []).map((row) => ({ id: row.id, name: row.name })),
      candidates: (clusters.data ?? []).map((row) => ({
        id: row.id, title: row.title, nicheName: row.niche_id ? nicheNames.get(row.niche_id) ?? "Unassigned" : "Unassigned",
        heat: Number(row.heat), confidence: Number(row.confidence), state: row.editorial_stage,
        sourceCount: signalCounts.get(row.id) ?? 0, lastCheckedAt: row.last_checked_at, sensitiveFlags: row.sensitive_flags,
      })),
      sources: (sources.data ?? []).map((row) => ({
        id: row.id, name: row.name, adapterType: row.adapter_type, active: row.active,
        healthy: row.active && (failureCounts.get(row.id) ?? 0) === 0, lastPolledAt: row.last_polled_at,
        failureCount: failureCounts.get(row.id) ?? 0,
      })),
      runs: (runs.data ?? []).map((row) => ({ id: row.id, status: row.status, startedAt: row.started_at, insertedCount: row.inserted_count, errorCount: row.error_count })),
    };
  }

  async candidate(id: string): Promise<StudioCandidateDetail | null> {
    const cluster = await this.client.from("topic_clusters").select("id, title, niche_id, heat, confidence, sensitive_flags").eq("id", id).maybeSingle();
    check("Load studio candidate", cluster.error);
    if (!cluster.data) return null;
    const links = await this.client.from("cluster_signals").select("raw_signal_id").eq("cluster_id", id);
    check("Load studio evidence links", links.error);
    const ids = (links.data ?? []).map((row) => row.raw_signal_id);
    const signals = ids.length
      ? await this.client.from("raw_signals").select("id, title, source_name, canonical_url, trust_tier, availability").in("id", ids)
      : { data: [], error: null };
    check("Load studio evidence", signals.error);
    const story = await this.client.from("stories").select("id").eq("cluster_id", id).maybeSingle();
    check("Load candidate story", story.error);
    const revisions = story.data
      ? await this.client.from("story_revisions").select("revision, created_at, editor_id").eq("story_id", story.data.id).order("revision", { ascending: false })
      : { data: [], error: null };
    check("Load revision history", revisions.error);
    return {
      id: cluster.data.id, title: cluster.data.title, nicheId: cluster.data.niche_id,
      heat: Number(cluster.data.heat), confidence: Number(cluster.data.confidence), sensitiveFlags: cluster.data.sensitive_flags,
      evidence: (signals.data ?? []).map((row) => ({ id: row.id, title: row.title, sourceName: row.source_name, sourceUrl: row.canonical_url, trustTier: row.trust_tier, availability: row.availability })),
      revisions: (revisions.data ?? []).map((row) => ({ revision: row.revision, createdAt: row.created_at, editorId: row.editor_id })),
    };
  }
}
