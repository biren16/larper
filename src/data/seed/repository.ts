import type {
  DiscoveryRepository,
  DiscoveryTopicPage,
  CurrentTopicPageOptions,
  DiscoveryTopic,
  MediaAsset,
  Niche,
  SourceSignal,
} from "@/domain/discovery/types";
import { seedDataset } from "./data";
import { validateSeedDataset } from "./validate";

class SeedDiscoveryRepository implements DiscoveryRepository {
  readonly validationErrors = validateSeedDataset(seedDataset);

  async listNiches(): Promise<Niche[]> { return seedDataset.niches.filter((niche) => niche.status === "active"); }
  async getNicheBySlug(slug: string): Promise<Niche | null> {
    return seedDataset.niches.find((niche) => niche.slug === slug && niche.status === "active") ?? null;
  }
  async listTopics(): Promise<DiscoveryTopic[]> { return seedDataset.topics; }
  async getTopicBySlug(slug: string): Promise<DiscoveryTopic | null> {
    return seedDataset.topics.find((topic) => topic.slug === slug && topic.status === "published") ?? null;
  }
  async listSignalsForTopic(topicId: string): Promise<SourceSignal[]> {
    return seedDataset.sourceSignals.filter((signal) => signal.topicId === topicId);
  }
  async listMedia(): Promise<MediaAsset[]> { return seedDataset.media; }
  async getMediaById(id: string): Promise<MediaAsset | null> {
    return seedDataset.media.find((asset) => asset.id === id) ?? null;
  }
  async listCurrentTopicsPage({ limit, cursor }: CurrentTopicPageOptions): Promise<DiscoveryTopicPage> {
    const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    const offset = cursor && /^\d+$/.test(cursor) ? Number(cursor) : 0;
    const current = seedDataset.topics.filter((topic) => topic.status === "published" && topic.mode === "current");
    const items = current.slice(offset, offset + safeLimit);
    const nextOffset = offset + items.length;
    return { items, nextCursor: nextOffset < current.length ? String(nextOffset) : null };
  }
}

export const seedRepository = new SeedDiscoveryRepository();
