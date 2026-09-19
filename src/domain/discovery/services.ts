import type { DiscoveryRepository, DiscoveryTopic, MediaAsset, Niche, SourceSignal } from "./types";
import { rankCurrentTopics, rankDeepLore, type RankedTopic } from "./ranking";

export interface TopicViewModel {
  topic: DiscoveryTopic;
  niche: Niche;
  media: MediaAsset | null;
  sources: SourceSignal[];
  score: number;
  sourceCount: number;
}

export interface DiscoveryHomeViewModel {
  niches: Niche[];
  followedNiches: Niche[];
  recommendedNiches: Niche[];
  currentTopics: TopicViewModel[];
  deepLore: TopicViewModel[];
}

export interface TopicDetailViewModel extends TopicViewModel {
  relatedTopics: TopicViewModel[];
}

export interface NichePageViewModel {
  niche: Niche;
  media: MediaAsset | null;
  isFollowed: boolean;
  currentTopics: TopicViewModel[];
  deepLore: TopicViewModel[];
  relatedNiches: Niche[];
  relatedNicheCards: Array<{ niche: Niche; media: MediaAsset | null }>;
}

export async function buildDiscoveryHome(
  repository: DiscoveryRepository,
  followedNicheIds: string[],
): Promise<DiscoveryHomeViewModel> {
  const [niches, topics, media] = await Promise.all([
    repository.listNiches(),
    repository.listTopics(),
    repository.listMedia(),
  ]);
  const allSignals = (await Promise.all(topics.map((topic) => repository.listSignalsForTopic(topic.id)))).flat();
  const followedSet = new Set(followedNicheIds);
  const followedNiches = followedNicheIds
    .map((id) => niches.find((niche) => niche.id === id))
    .filter((niche): niche is Niche => Boolean(niche));

  return {
    niches,
    followedNiches,
    recommendedNiches: niches.filter((niche) => !followedSet.has(niche.id)),
    currentTopics: rankCurrentTopics(topics, allSignals, followedSet).map((item) => toTopicViewModel(item, niches, media, allSignals)),
    deepLore: rankDeepLore(topics, allSignals).map((item) => toTopicViewModel(item, niches, media, allSignals)),
  };
}

export async function buildTopicDetail(
  repository: DiscoveryRepository,
  slug: string,
): Promise<TopicDetailViewModel | null> {
  const topic = await repository.getTopicBySlug(slug);
  if (!topic) return null;

  const [niches, topics, media, sources] = await Promise.all([
    repository.listNiches(),
    repository.listTopics(),
    repository.listMedia(),
    repository.listSignalsForTopic(topic.id),
  ]);
  const niche = niches.find((item) => item.id === topic.nicheId);
  if (!niche) return null;
  const relatedTopics = topic.relatedTopicIds
    .map((id) => topics.find((item) => item.id === id && item.status === "published"))
    .filter((item): item is DiscoveryTopic => Boolean(item));

  return {
    topic,
    niche,
    media: media.find((asset) => asset.id === topic.mediaId) ?? null,
    sources,
    score: 0,
    sourceCount: sources.length,
    relatedTopics: await Promise.all(
      relatedTopics.map(async (related) => {
        const relatedSources = await repository.listSignalsForTopic(related.id);
        return {
          topic: related,
          niche: niches.find((item) => item.id === related.nicheId)!,
          media: media.find((asset) => asset.id === related.mediaId) ?? null,
          sources: relatedSources,
          score: 0,
          sourceCount: relatedSources.length,
        };
      }),
    ),
  };
}

export async function buildNichePage(
  repository: DiscoveryRepository,
  slug: string,
  followedNicheIds: string[],
): Promise<NichePageViewModel | null> {
  const niche = await repository.getNicheBySlug(slug);
  if (!niche) return null;
  const [niches, topics, media] = await Promise.all([
    repository.listNiches(),
    repository.listTopics(),
    repository.listMedia(),
  ]);
  const nicheTopics = topics.filter((topic) => topic.nicheId === niche.id);
  const allSignals = (await Promise.all(nicheTopics.map((topic) => repository.listSignalsForTopic(topic.id)))).flat();
  const followedSet = new Set(followedNicheIds);

  return {
    niche,
    media: media.find((asset) => asset.id === niche.heroMediaId) ?? null,
    isFollowed: followedSet.has(niche.id),
    currentTopics: rankCurrentTopics(nicheTopics, allSignals, followedSet).map((item) => toTopicViewModel(item, niches, media, allSignals)),
    deepLore: rankDeepLore(nicheTopics, allSignals).map((item) => toTopicViewModel(item, niches, media, allSignals)),
    relatedNiches: niche.relatedNicheIds
      .map((id) => niches.find((item) => item.id === id))
      .filter((item): item is Niche => Boolean(item)),
    relatedNicheCards: niche.relatedNicheIds
      .map((id) => niches.find((item) => item.id === id))
      .filter((item): item is Niche => Boolean(item))
      .map((item) => ({
        niche: item,
        media: media.find((asset) => asset.id === item.heroMediaId) ?? null,
      })),
  };
}

function toTopicViewModel(
  ranked: RankedTopic,
  niches: Niche[],
  media: MediaAsset[],
  signals: SourceSignal[],
): TopicViewModel {
  return {
    topic: ranked.topic,
    niche: niches.find((niche) => niche.id === ranked.topic.nicheId)!,
    media: media.find((asset) => asset.id === ranked.topic.mediaId) ?? null,
    sources: signals.filter((signal) => signal.topicId === ranked.topic.id),
    score: ranked.score,
    sourceCount: ranked.sourceCount,
  };
}
