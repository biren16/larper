import { describe, expect, it } from "vitest";
import type { DiscoveryDatabaseReader } from "./repository";
import { PostgresDiscoveryRepository } from "./repository";

const niche = {
  id: "books",
  slug: "books",
  name: "Books",
  description: "What readers are circulating.",
  curiosityHook: "The paperback taking over every commute.",
  parentCategory: "Culture",
  relatedNicheIds: [],
  status: "active" as const,
  origin: "ingested" as const,
};

const topic = {
  id: "book-one",
  slug: "book-one",
  nicheId: "books",
  title: "A racing novel crosses over",
  hook: "Readers arrived through F1 edits.",
  summary: "A verified summary.",
  whyItMatters: "Two communities are crossing over.",
  lore: "Context.",
  beginnerContext: "Start here.",
  type: "TREND" as const,
  mode: "current" as const,
  publicationFormat: "story" as const,
  lifecycle: "published_story" as const,
  regions: ["india", "global"],
  firstDetectedAt: "2026-09-20T00:00:00.000Z",
  lastUpdatedAt: "2026-09-20T03:00:00.000Z",
  lastCheckedAt: "2026-09-20T03:00:00.000Z",
  publishedAt: "2026-09-20T03:00:00.000Z",
  freshnessLabel: "Moving now",
  confidence: 88,
  evidenceSummary: "Three independent signals",
  signals: { freshness: 90, momentum: 82, novelty: 75 },
  tags: ["books", "f1"],
  relatedTopicIds: [],
  status: "published" as const,
  origin: "ingested" as const,
};

function reader(): DiscoveryDatabaseReader {
  return {
    listNiches: async () => [niche],
    getNicheBySlug: async (slug) => slug === niche.slug ? niche : null,
    listTopics: async () => [topic],
    getTopicBySlug: async (slug) => slug === topic.slug ? topic : null,
    listSignalsForTopic: async () => [],
    listMedia: async () => [],
    getMediaById: async () => null,
    listCurrentTopicsPage: async () => ({ items: [topic], nextCursor: null }),
  };
}

describe("PostgresDiscoveryRepository", () => {
  it("delegates normalized reads without leaking database rows", async () => {
    const repository = new PostgresDiscoveryRepository(reader());

    await expect(repository.getNicheBySlug("books")).resolves.toEqual(niche);
    await expect(repository.getTopicBySlug("book-one")).resolves.toEqual(topic);
    await expect(repository.listCurrentTopicsPage({ limit: 10 })).resolves.toEqual({ items: [topic], nextCursor: null });
  });
});
