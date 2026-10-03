import { hasUsageReview } from "@/backend/ingestion/source-review";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoryDraft } from "./types";
import type { Database } from "@/data/postgres/database.types";
import type { StudioDashboardData, StudioSource, StudioSourcesData } from "@/app/studio/studio-dashboard";
import type { StudioCandidateDetail } from "@/app/studio/candidates/story-editor";

function check(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class StudioReader {
  constructor(private readonly client: SupabaseClient<Database>, private readonly now: () => number = Date.now) {}

  async dashboard(): Promise<StudioDashboardData> {
    const [clusters, niches, sources, failures, runs, links, recentSignals, working] = await Promise.all([
      this.client.from("topic_clusters").select("id, title, niche_id, heat, confidence, state, editorial_stage, last_checked_at, sensitive_flags").is("trashed_at", null).in("state", ["detected", "reviewing"]).order("heat", { ascending: false }).limit(50),
      this.client.from("niches").select("id, name"),
      this.client.from("source_definitions").select("id, name, adapter_type, watchlist_beat, active, last_polled_at, poll_minutes, trust_tier, config").order("name"),
      this.client.from("source_failures").select("source_definition_id").is("resolved_at", null),
      this.client.from("ingestion_runs").select("id, status, started_at, inserted_count, error_count").order("started_at", { ascending: false }).limit(20),
      this.client.from("cluster_signals").select("cluster_id, raw_signal_id"),
      this.client.from("raw_signals").select("id, title, canonical_url, source_name, source_type, suggested_niche_id, region, observed_at, availability").eq("availability", "available").order("observed_at", { ascending: false }).limit(8),
      this.client.from("editorial_working_drafts").select("candidate_id, content"),
    ]);
    [clusters, niches, sources, failures, runs, links, recentSignals, working].forEach((result) => check("Load studio dashboard", result.error));
    const workingByCandidate = new Map((working.data ?? []).map(row => [row.candidate_id, row.content as unknown as Partial<StoryDraft>]));
    const nicheNames = new Map((niches.data ?? []).map((row) => [row.id, row.name]));
    const failureCounts = new Map<string, number>();
    (failures.data ?? []).forEach((row) => failureCounts.set(row.source_definition_id, (failureCounts.get(row.source_definition_id) ?? 0) + 1));
    const signalCounts = new Map<string, number>();
    (links.data ?? []).forEach((row) => signalCounts.set(row.cluster_id, (signalCounts.get(row.cluster_id) ?? 0) + 1));
    const clusterBySignal = new Map((links.data ?? []).map((row) => [row.raw_signal_id, row.cluster_id]));
    return {
      niches: (niches.data ?? []).map((row) => ({ id: row.id, name: row.name })),
      candidates: (clusters.data ?? []).map((row) => ({
        id: row.id, title: workingByCandidate.get(row.id)?.title ?? row.title, nicheName: nicheNames.get(workingByCandidate.get(row.id)?.nicheId ?? row.niche_id ?? "") ?? "Unassigned",
        heat: Number(row.heat), confidence: Number(row.confidence), state: row.editorial_stage,
        sourceCount: signalCounts.get(row.id) ?? 0, lastCheckedAt: row.last_checked_at, sensitiveFlags: row.sensitive_flags,
      })),
      sources: (sources.data ?? []).map((row) => this.mapSource(row, failureCounts)),
      runs: (runs.data ?? []).map((row) => ({ id: row.id, status: row.status, startedAt: row.started_at, insertedCount: row.inserted_count, errorCount: row.error_count })),
      recentSignals: (recentSignals.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        canonicalUrl: row.canonical_url,
        sourceName: row.source_name,
        sourceType: row.source_type,
        nicheName: row.suggested_niche_id ? nicheNames.get(row.suggested_niche_id) ?? "Unassigned" : "Unassigned",
        region: row.region,
        observedAt: row.observed_at,
        availability: row.availability,
        clusterId: clusterBySignal.get(row.id) ?? null,
      })),
    };
  }

  async sources(): Promise<StudioSourcesData> {
    const [sources, failures, runs] = await Promise.all([
      this.client.from("source_definitions").select("id, name, adapter_type, watchlist_beat, active, last_polled_at, poll_minutes, trust_tier, config").order("name"),
      this.client.from("source_failures").select("source_definition_id").is("resolved_at", null),
      this.client.from("ingestion_runs").select("id, status, started_at, inserted_count, error_count").order("started_at", { ascending: false }).limit(20),
    ]);
    [sources, failures, runs].forEach((result) => check("Load studio sources", result.error));
    const failureCounts = new Map<string, number>();
    (failures.data ?? []).forEach((row) => failureCounts.set(row.source_definition_id, (failureCounts.get(row.source_definition_id) ?? 0) + 1));
    return {
      sources: (sources.data ?? []).map((row) => this.mapSource(row, failureCounts)),
      runs: (runs.data ?? []).map((row) => ({ id: row.id, status: row.status, startedAt: row.started_at, insertedCount: row.inserted_count, errorCount: row.error_count })),
    };
  }

  private mapSource(
    row: { id: string; name: string; adapter_type: string; watchlist_beat: string | null; active: boolean; last_polled_at: string | null; poll_minutes: number; trust_tier: string; config?: unknown },
    failureCounts: Map<string, number>,
  ): StudioSource {
    const config = row.config && typeof row.config === "object" ? row.config as Record<string, unknown> : {};
    const failureCount = failureCounts.get(row.id) ?? 0;
    const status = row.adapter_type === "trend" ? "waiting"
      : !row.active ? "paused"
      : row.adapter_type === "manual" ? "manual"
      : !hasUsageReview(config) ? "review"
      : failureCount > 0 ? "attention"
      : !row.last_polled_at ? "pending"
      : !Number.isFinite(Date.parse(row.last_polled_at)) || this.now() - Date.parse(row.last_polled_at) > row.poll_minutes * 2 * 60_000 ? "stale"
      : "live";
    return {
      id: row.id,
      name: row.name,
      adapterType: row.adapter_type,
      watchlistBeat: row.watchlist_beat,
      active: row.active,
      healthy: status === "live",
      lastPolledAt: row.last_polled_at,
      failureCount,
      trustTier: row.trust_tier,
      status, config,
      locator: typeof config.url === "string" ? config.url : undefined,
      usageNotes: typeof config.usageNotes === "string" ? config.usageNotes : undefined,
      usageReviewed: hasUsageReview(config),
      usageReview: hasUsageReview(config) ? config.usageReview as StudioSource["usageReview"] : undefined,
    };
  }

  async candidate(id: string): Promise<StudioCandidateDetail | null> {
    const cluster = await this.client.from("topic_clusters").select("id, title, niche_id, heat, confidence, sensitive_flags, editorial_version, trashed_at").eq("id", id).maybeSingle();
    check("Load studio candidate", cluster.error);
    if (!cluster.data) return null;
    const links = await this.client.from("cluster_signals").select("raw_signal_id").eq("cluster_id", id);
    check("Load studio evidence links", links.error);
    const ids = (links.data ?? []).map((row) => row.raw_signal_id);
    const signals = ids.length
      ? await this.client.from("raw_signals").select("id, title, source_name, canonical_url, trust_tier, availability").in("id", ids)
      : { data: [], error: null };
    check("Load studio evidence", signals.error);
    const story = await this.client.from("stories").select("*").eq("cluster_id", id).maybeSingle();
    check("Load candidate story", story.error);
    const working = await this.client.from("editorial_working_drafts").select("content, revision").eq("candidate_id", id).maybeSingle();
    check("Load private working draft", working.error);
    const media = await this.client.from("media_assets").select("id, alt, credit_line, kind, commercial_use_allowed").order("created_at", { ascending: false }).limit(100);
    check("Load approved media", media.error);
    const revisions = story.data
      ? await this.client.from("story_revisions").select("revision, created_at, editor_id").eq("story_id", story.data.id).order("revision", { ascending: false })
      : { data: [], error: null };
    check("Load revision history", revisions.error);
    return {
      id: cluster.data.id, title: (working.data?.content as unknown as Partial<StoryDraft>)?.title ?? cluster.data.title, nicheId: (working.data?.content as unknown as Partial<StoryDraft>)?.nicheId ?? cluster.data.niche_id,
      heat: Number(cluster.data.heat), confidence: Number(cluster.data.confidence), sensitiveFlags: cluster.data.sensitive_flags,
      evidence: (signals.data ?? []).map((row) => ({ id: row.id, title: row.title, sourceName: row.source_name, sourceUrl: row.canonical_url, trustTier: row.trust_tier, availability: row.availability })),
      revisions: (revisions.data ?? []).map((row) => ({ revision: row.revision, createdAt: row.created_at, editorId: row.editor_id })),
      trashedAt: cluster.data.trashed_at,
      everPublished: Boolean(story.data?.original_published_at),
      needsReviewReason: story.data?.needs_review_reason,
      editorialVersion: cluster.data.editorial_version ?? 0,
      mediaId: working.data ? (working.data.content as unknown as StoryDraft).mediaId ?? null : story.data?.media_id ?? null,
      storyLifecycle: story.data?.lifecycle,
      scheduledFor: story.data?.scheduled_for,
      draft: working.data ? working.data.content as unknown as StoryDraft : story.data ? {
        mediaId: story.data.media_id, nicheId: story.data.niche_id, slug: story.data.slug, title: story.data.title,
        hook: story.data.hook, summary: story.data.summary, whyItMatters: story.data.why_it_matters,
        lore: story.data.lore, beginnerContext: story.data.beginner_context, conversationLine: story.data.conversation_line,
        discoveryType: story.data.discovery_type as StoryDraft["discoveryType"], mode: story.data.mode as StoryDraft["mode"],
        regions: story.data.regions, freshnessLabel: story.data.freshness_label, evidenceSummary: story.data.evidence_summary,
        tags: story.data.tags, independentSourcesConfirmed: false,
      } : undefined,
      mediaOptions: (media.data ?? []).filter((row) => row.kind === "larper" || row.commercial_use_allowed).map((row) => ({ id: row.id, alt: row.alt, creditLine: row.credit_line })),
    };
  }
}
