import { canonicalizeUrl } from "./canonical-url";
import type { NormalizedSignal, SourceDefinition } from "./types";

type YouTubeItem = {
  id?: { videoId?: string; channelId?: string; playlistId?: string };
  snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
};

function metric(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function normalizeYouTubeResponse(
  response: { items?: YouTubeItem[] },
  source: SourceDefinition,
  observedAt: string,
): NormalizedSignal[] {
  return (response.items ?? []).flatMap((item) => {
    const videoId = item.id?.videoId;
    const title = item.snippet?.title?.trim();
    if (!videoId || !title) return [];
    const metrics = {
      views: metric(item.statistics?.viewCount),
      likes: metric(item.statistics?.likeCount),
      comments: metric(item.statistics?.commentCount),
    };
    return [{
      sourceDefinitionId: source.id,
      canonicalUrl: canonicalizeUrl(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`),
      externalId: videoId,
      sourceType: "youtube" as const,
      sourceName: source.name,
      author: item.snippet?.channelTitle?.trim() || undefined,
      title,
      body: item.snippet?.description?.trim() || undefined,
      locale: source.locale,
      region: source.region,
      publishedAt: item.snippet?.publishedAt && Number.isFinite(Date.parse(item.snippet.publishedAt))
        ? new Date(item.snippet.publishedAt).toISOString()
        : observedAt,
      observedAt,
      trustTier: source.trustTier,
      availability: "available" as const,
      metrics: Object.fromEntries(Object.entries(metrics).filter((entry): entry is [string, number] => entry[1] !== undefined)),
      sensitiveFlags: [],
    }];
  });
}
