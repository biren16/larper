export type DiscoveryType =
  | "DROP"
  | "LORE"
  | "MEME"
  | "TREND"
  | "DEBATE"
  | "COMEBACK"
  | "PRODUCT"
  | "EVENT"
  | "PERSON"
  | "AESTHETIC"
  | "DRAMA"
  | "RABBIT_HOLE";

export type TopicMode = "current" | "deep-lore";
export type ContentOrigin = "seed" | "ingested";
export type ContentStatus = "active" | "inactive";
export type TopicStatus = "published" | "draft";
export type PublicationFormat = "story" | "brief";
export type TopicLifecycle = "detected" | "reviewing" | "published_story" | "published_brief" | "rejected" | "expired";
export type SourceType = "reddit" | "youtube" | "rss" | "blog" | "publication" | "trend" | "instagram" | "tiktok" | "manual" | "web";
export type SourceTrustTier = "primary" | "publication" | "community" | "watchlist";
export type SourceAvailability = "available" | "deleted" | "private" | "unreachable";

export interface CurrentTopicPageOptions {
  limit: number;
  cursor?: string | null;
}

export interface DiscoveryTopicPage {
  items: DiscoveryTopic[];
  nextCursor: string | null;
}

export interface Niche {
  id: string;
  slug: string;
  name: string;
  description: string;
  curiosityHook: string;
  parentCategory: string;
  relatedNicheIds: string[];
  heroMediaId?: string;
  status: ContentStatus;
  origin: ContentOrigin;
}

export interface TopicSignals {
  freshness: number;
  momentum: number;
  novelty: number;
  sourceDiversity?: number;
  indiaRelevance?: number;
  crossover?: number;
}

export interface DiscoveryTopic {
  id: string;
  slug: string;
  nicheId: string;
  title: string;
  hook: string;
  summary: string;
  whyItMatters: string;
  lore: string;
  beginnerContext: string;
  type: DiscoveryType;
  mode: TopicMode;
  publicationFormat: PublicationFormat;
  lifecycle: TopicLifecycle;
  regions: string[];
  firstDetectedAt: string;
  lastUpdatedAt: string;
  lastCheckedAt: string;
  publishedAt: string;
  freshnessLabel: string;
  confidence: number;
  evidenceSummary: string;
  signals: TopicSignals;
  mediaId?: string;
  tags: string[];
  relatedTopicIds: string[];
  status: TopicStatus;
  origin: ContentOrigin;
}

export interface SourceSignal {
  id: string;
  topicId: string;
  sourceType: SourceType;
  sourceName: string;
  sourceDefinitionId: string;
  sourceUrl?: string;
  canonicalUrl?: string;
  externalId?: string;
  author?: string;
  title: string;
  locale: string;
  region: string;
  publishedAt: string;
  observedAt: string;
  engagement?: Record<string, number>;
  metricSnapshot?: Record<string, number>;
  trustTier: SourceTrustTier;
  availability: SourceAvailability;
  signalStrength: number;
  origin: ContentOrigin;
}

export interface MediaAsset {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  focalPosition?: string;
}

export interface SeedDataset {
  niches: Niche[];
  topics: DiscoveryTopic[];
  sourceSignals: SourceSignal[];
  media: MediaAsset[];
}

export interface DiscoveryRepository {
  listNiches(): Promise<Niche[]>;
  getNicheBySlug(slug: string): Promise<Niche | null>;
  listTopics(): Promise<DiscoveryTopic[]>;
  getTopicBySlug(slug: string): Promise<DiscoveryTopic | null>;
  listSignalsForTopic(topicId: string): Promise<SourceSignal[]>;
  listMedia(): Promise<MediaAsset[]>;
  getMediaById(id: string): Promise<MediaAsset | null>;
  listCurrentTopicsPage(options: CurrentTopicPageOptions): Promise<DiscoveryTopicPage>;
}
