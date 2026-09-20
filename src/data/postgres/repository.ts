import type {
  CurrentTopicPageOptions,
  DiscoveryRepository,
  DiscoveryTopic,
  DiscoveryTopicPage,
  MediaAsset,
  Niche,
  SourceSignal,
} from "@/domain/discovery/types";

export interface DiscoveryDatabaseReader {
  listNiches(): Promise<Niche[]>;
  getNicheBySlug(slug: string): Promise<Niche | null>;
  listTopics(): Promise<DiscoveryTopic[]>;
  getTopicBySlug(slug: string): Promise<DiscoveryTopic | null>;
  listSignalsForTopic(topicId: string): Promise<SourceSignal[]>;
  listMedia(): Promise<MediaAsset[]>;
  getMediaById(id: string): Promise<MediaAsset | null>;
  listCurrentTopicsPage(options: CurrentTopicPageOptions): Promise<DiscoveryTopicPage>;
}

export class PostgresDiscoveryRepository implements DiscoveryRepository {
  constructor(private readonly reader: DiscoveryDatabaseReader) {}

  listNiches() { return this.reader.listNiches(); }
  getNicheBySlug(slug: string) { return this.reader.getNicheBySlug(slug); }
  listTopics() { return this.reader.listTopics(); }
  getTopicBySlug(slug: string) { return this.reader.getTopicBySlug(slug); }
  listSignalsForTopic(topicId: string) { return this.reader.listSignalsForTopic(topicId); }
  listMedia() { return this.reader.listMedia(); }
  getMediaById(id: string) { return this.reader.getMediaById(id); }
  listCurrentTopicsPage(options: CurrentTopicPageOptions) { return this.reader.listCurrentTopicsPage(options); }
}
