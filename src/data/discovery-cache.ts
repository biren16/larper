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

// Database cron can reopen a story without going through a Next.js Server Action.
const LIVE_CACHE_PROFILE = { stale: 30, revalidate: 60, expire: 300 };

export async function getCachedDiscoveryHome() {
  "use cache";
  cacheLife(LIVE_CACHE_PROFILE);
  cacheTag(DISCOVERY_CACHE_TAGS.feed, DISCOVERY_CACHE_TAGS.niches);
  return buildDiscoveryHome(getDiscoveryRepository(), DEFAULT_FOLLOWED_NICHE_IDS);
}

export async function getCachedTopicDetail(slug: string) {
  "use cache";
  cacheLife(LIVE_CACHE_PROFILE);
  cacheTag(DISCOVERY_CACHE_TAGS.feed, DISCOVERY_CACHE_TAGS.topic(slug));
  return buildTopicDetail(getDiscoveryRepository(), slug);
}

export async function getCachedNichePage(slug: string) {
  "use cache";
  cacheLife(LIVE_CACHE_PROFILE);
  cacheTag(DISCOVERY_CACHE_TAGS.feed, DISCOVERY_CACHE_TAGS.niches, DISCOVERY_CACHE_TAGS.niche(slug));
  return buildNichePage(getDiscoveryRepository(), slug, DEFAULT_FOLLOWED_NICHE_IDS);
}

export async function getCachedNiches() {
  "use cache";
  cacheLife(LIVE_CACHE_PROFILE);
  cacheTag(DISCOVERY_CACHE_TAGS.niches);
  return getDiscoveryRepository().listNiches();
}
