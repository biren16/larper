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
export type SourceType = "reddit" | "youtube" | "rss" | "blog" | "publication" | "trend";

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
  firstDetectedAt: string;
  lastUpdatedAt: string;
  publishedAt: string;
  freshnessLabel: string;
  signals: { freshness: number; momentum: number; novelty: number };
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
  sourceUrl?: string;
  externalId?: string;
  title: string;
  publishedAt: string;
  engagement?: Record<string, number>;
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
}

