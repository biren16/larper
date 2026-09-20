import { cacheLife, cacheTag } from "next/cache";
import { buildDiscoveryHome, buildNichePage, buildTopicDetail } from "@/domain/discovery/services";
import { DEFAULT_FOLLOWED_NICHE_IDS } from "@/domain/preferences/preferences";
import { getDiscoveryRepository } from "./runtime-repository";

export const DISCOVERY_CACHE_TAGS = {
  feed: "discovery:feed",
  niches: "discovery:niches",
  topic: (slug: string) => `discovery:topic:${slug}`,
  niche: (slug: string) => `discovery:niche:${slug}`,
} as const;

export async function getCachedDiscoveryHome() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 10800 });
  cacheTag(DISCOVERY_CACHE_TAGS.feed, DISCOVERY_CACHE_TAGS.niches);
  return buildDiscoveryHome(getDiscoveryRepository(), DEFAULT_FOLLOWED_NICHE_IDS);
}

export async function getCachedTopicDetail(slug: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 10800 });
  cacheTag(DISCOVERY_CACHE_TAGS.feed, DISCOVERY_CACHE_TAGS.topic(slug));
  return buildTopicDetail(getDiscoveryRepository(), slug);
}

export async function getCachedNichePage(slug: string) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 10800 });
  cacheTag(DISCOVERY_CACHE_TAGS.feed, DISCOVERY_CACHE_TAGS.niches, DISCOVERY_CACHE_TAGS.niche(slug));
  return buildNichePage(getDiscoveryRepository(), slug, DEFAULT_FOLLOWED_NICHE_IDS);
}

export async function getCachedNiches() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 10800 });
  cacheTag(DISCOVERY_CACHE_TAGS.niches);
  return getDiscoveryRepository().listNiches();
}
