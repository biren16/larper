import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "./database.types";
import type { DiscoveryDatabaseReader } from "./repository";
import type {
  CurrentTopicPageOptions, DiscoveryTopic, DiscoveryTopicPage, MediaAsset, Niche, SourceSignal, TopicSignals,
} from "@/domain/discovery/types";

type StoryRow = Database["public"]["Tables"]["stories"]["Row"];
type NicheRow = Database["public"]["Tables"]["niches"]["Row"];
type MediaRow = Database["public"]["Tables"]["media_assets"]["Row"];
type RawSignalRow = Database["public"]["Tables"]["raw_signals"]["Row"];
type PublicSignalRow = Pick<RawSignalRow, "id" | "source_definition_id" | "canonical_url" | "external_id" | "source_type" | "source_name" | "author" | "title" | "locale" | "region" | "published_at" | "observed_at" | "trust_tier" | "availability" | "metrics"> & { signal_strength?: number };

const publishedLifecycles = ["published_story", "published_brief"];

function objectNumbers(value: Json): Record<string, number> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

function readScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export function mapStoryRow(row: Omit<StoryRow, "reviewed_by" | "created_at" | "updated_at"> & Partial<Pick<StoryRow, "reviewed_by" | "created_at" | "updated_at">>): DiscoveryTopic {
  const scores = row.signals && !Array.isArray(row.signals) && typeof row.signals === "object" ? row.signals : {};
  const score = (camel: string, snake: string) => readScore(scores[camel] ?? scores[snake]);
  return {
    id: row.id, slug: row.slug, nicheId: row.niche_id, title: row.title, hook: row.hook,
    summary: row.summary, whyItMatters: row.why_it_matters, lore: row.lore, beginnerContext: row.beginner_context,
    type: row.discovery_type as DiscoveryTopic["type"], mode: row.mode as DiscoveryTopic["mode"],
    publicationFormat: row.publication_format as DiscoveryTopic["publicationFormat"],
    lifecycle: row.lifecycle as DiscoveryTopic["lifecycle"], regions: row.regions,
    firstDetectedAt: row.first_detected_at, lastUpdatedAt: row.last_updated_at, lastCheckedAt: row.last_checked_at,
    publishedAt: row.published_at ?? row.last_updated_at, freshnessLabel: row.freshness_label,
    confidence: Number(row.confidence), evidenceSummary: row.evidence_summary,
    signals: {
      freshness: score("freshness", "freshness"), momentum: score("momentum", "momentum"), novelty: score("novelty", "novelty"),
      sourceDiversity: score("sourceDiversity", "source_diversity"), indiaRelevance: score("indiaRelevance", "india_relevance"),
      crossover: score("crossover", "crossover"),
    } satisfies TopicSignals,
    mediaId: row.media_id ?? undefined, tags: row.tags, relatedTopicIds: row.related_story_ids,
    status: publishedLifecycles.includes(row.lifecycle) ? "published" : "draft", origin: "ingested",
  };
}

export function mapNicheRow(row: Pick<NicheRow, "id" | "slug" | "name" | "description" | "curiosity_hook" | "parent_category" | "related_niche_ids" | "hero_media_id" | "status" | "origin">): Niche {
  return { id: row.id, slug: row.slug, name: row.name, description: row.description, curiosityHook: row.curiosity_hook, parentCategory: row.parent_category, relatedNicheIds: row.related_niche_ids, heroMediaId: row.hero_media_id ?? undefined, status: row.status as Niche["status"], origin: row.origin as Niche["origin"] };
}

export function mapMediaRow(row: Pick<MediaRow, "id" | "src" | "alt" | "width" | "height" | "focal_position">): MediaAsset {
  return { id: row.id, src: row.src, alt: row.alt, width: row.width, height: row.height, focalPosition: row.focal_position ?? undefined };
}

export function mapSignalRow(topicId: string, row: PublicSignalRow): SourceSignal {
  const metrics = objectNumbers(row.metrics);
  return {
    id: row.id, topicId, sourceType: row.source_type as SourceSignal["sourceType"], sourceName: row.source_name,
    sourceDefinitionId: row.source_definition_id, sourceUrl: row.canonical_url, canonicalUrl: row.canonical_url,
    externalId: row.external_id ?? undefined, author: row.author ?? undefined, title: row.title, locale: row.locale,
    region: row.region, publishedAt: row.published_at, observedAt: row.observed_at, engagement: metrics,
    metricSnapshot: metrics, trustTier: row.trust_tier as SourceSignal["trustTier"],
    availability: row.availability as SourceSignal["availability"], signalStrength: readScore(row.signal_strength ?? metrics.signalStrength),
    origin: "ingested",
  };
}

function assertResult<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`);
  if (result.data === null) throw new Error(`${operation}: no data returned`);
  return result.data;
}

export class SupabaseDiscoveryReader implements DiscoveryDatabaseReader {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listNiches(): Promise<Niche[]> {
    const result = await this.client.from("niches").select("*").eq("status", "active").order("name");
    return assertResult(result, "List niches").map(mapNicheRow);
  }
  async getNicheBySlug(slug: string): Promise<Niche | null> {
    const result = await this.client.from("niches").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
    if (result.error) throw new Error(`Get niche: ${result.error.message}`);
    return result.data ? mapNicheRow(result.data) : null;
  }
  async listTopics(): Promise<DiscoveryTopic[]> {
    const result = await this.client.from("stories").select("*").in("lifecycle", publishedLifecycles).order("published_at", { ascending: false });
    return assertResult(result, "List stories").map(mapStoryRow);
  }
  async getTopicBySlug(slug: string): Promise<DiscoveryTopic | null> {
    const result = await this.client.from("stories").select("*").eq("slug", slug).in("lifecycle", publishedLifecycles).maybeSingle();
    if (result.error) throw new Error(`Get story: ${result.error.message}`);
    return result.data ? mapStoryRow(result.data) : null;
  }
  async listSignalsForTopic(topicId: string): Promise<SourceSignal[]> {
    const story = await this.client.from("stories").select("cluster_id").eq("id", topicId).maybeSingle();
    if (story.error) throw new Error(`Get story evidence: ${story.error.message}`);
    if (!story.data?.cluster_id) return [];
    const links = await this.client.from("cluster_signals").select("raw_signal_id, match_score").eq("cluster_id", story.data.cluster_id);
    const linked = assertResult(links, "List story evidence");
    if (linked.length === 0) return [];
    const strengths = new Map(linked.map((link) => [link.raw_signal_id, Number(link.match_score)]));
    const signals = await this.client.from("raw_signals").select("id, source_definition_id, canonical_url, external_id, source_type, source_name, author, title, locale, region, published_at, observed_at, trust_tier, availability, metrics").in("id", [...strengths.keys()]).eq("availability", "available");
    return assertResult(signals, "Load story evidence").map((row) => mapSignalRow(topicId, { ...row, signal_strength: strengths.get(row.id) }));
  }
  async listMedia(): Promise<MediaAsset[]> {
    const result = await this.client.from("media_assets").select("*");
    return assertResult(result, "List media").map(mapMediaRow);
  }
  async getMediaById(id: string): Promise<MediaAsset | null> {
    const result = await this.client.from("media_assets").select("*").eq("id", id).maybeSingle();
    if (result.error) throw new Error(`Get media: ${result.error.message}`);
    return result.data ? mapMediaRow(result.data) : null;
  }
  async listCurrentTopicsPage({ limit, cursor }: CurrentTopicPageOptions): Promise<DiscoveryTopicPage> {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
    const result = await this.client.from("stories").select("*").in("lifecycle", publishedLifecycles).eq("mode", "current").order("published_at", { ascending: false }).range(offset, offset + safeLimit);
    const rows = assertResult(result, "List current stories");
    const hasMore = rows.length > safeLimit;
    return { items: rows.slice(0, safeLimit).map(mapStoryRow), nextCursor: hasMore ? String(offset + safeLimit) : null };
  }
}
