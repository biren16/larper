"use server";

import { updateTag } from "next/cache";
import { DISCOVERY_CACHE_TAGS } from "@/data/discovery-cache";

export async function invalidatePublicDiscovery(content: { slug?: string }) {
  updateTag(DISCOVERY_CACHE_TAGS.feed);
  updateTag(DISCOVERY_CACHE_TAGS.niches);
  if (content.slug) updateTag(DISCOVERY_CACHE_TAGS.topic(content.slug));
}
