import { describe, expect, it } from "vitest";
import { calculateEvidenceScore, rankCurrentTopics, rankDeepLore } from "./ranking";
import type { DiscoveryTopic, SourceSignal } from "./types";

const topic = (overrides: Partial<DiscoveryTopic> = {}): DiscoveryTopic => ({
  id: "topic-a",
  slug: "topic-a",
  nicheId: "niche-a",
  title: "Topic A",
  hook: "Hook",
  summary: "Summary",
  whyItMatters: "Why",
  lore: "Lore",
  beginnerContext: "Beginner",
  type: "TREND" as const,
  mode: "current" as const,
  firstDetectedAt: "2026-09-10T00:00:00.000Z",
  lastUpdatedAt: "2026-09-18T00:00:00.000Z",
  publishedAt: "2026-09-12T00:00:00.000Z",
  freshnessLabel: "Picking up",
  signals: { freshness: 80, momentum: 70, novelty: 60 },
  tags: [],
  relatedTopicIds: [],
  status: "published" as const,
  origin: "seed" as const,
  ...overrides,
});

const signal = (id: string, sourceType: SourceSignal["sourceType"]): SourceSignal => ({
  id,
  topicId: "topic-a",
  sourceType,
  sourceName: id,
  title: id,
  publishedAt: "2026-09-18T00:00:00.000Z",
  signalStrength: 70,
  origin: "seed" as const,
});

describe("discovery ranking", () => {
  it("caps evidence derived from source volume and diversity at 100", () => {
    const signals = Array.from({ length: 8 }, (_, index) =>
      signal(`source-${index}`, index % 2 === 0 ? "reddit" : "youtube"),
    );
    expect(calculateEvidenceScore(signals as never[])).toBe(100);
  });

  it("applies the exact current-topic weights and followed affinity", () => {
    const ranked = rankCurrentTopics(
      [topic()],
      [signal("source-1", "reddit"), signal("source-2", "youtube")] as never[],
      new Set(["niche-a"]),
    );
    expect(ranked[0].score).toBe(69);
  });

  it("excludes drafts and deep-lore topics from the current feed", () => {
    const ranked = rankCurrentTopics(
      [topic(), topic({ id: "draft", status: "draft" }), topic({ id: "lore", mode: "deep-lore" })] as never[],
      [],
      new Set(),
    );
    expect(ranked.map(({ topic: item }) => item.id)).toEqual(["topic-a"]);
  });

  it("breaks equal scores by update time and then stable id", () => {
    const ranked = rankCurrentTopics(
      [
        topic({ id: "b", lastUpdatedAt: "2026-09-18T00:00:00.000Z" }),
        topic({ id: "c", lastUpdatedAt: "2026-09-19T00:00:00.000Z" }),
        topic({ id: "a", lastUpdatedAt: "2026-09-18T00:00:00.000Z" }),
      ] as never[],
      [],
      new Set(),
    );
    expect(ranked.map(({ topic: item }) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("ranks only published deep lore using novelty and evidence", () => {
    const ranked = rankDeepLore(
      [
        topic({ id: "low", mode: "deep-lore", signals: { freshness: 0, momentum: 0, novelty: 40 } }),
        topic({ id: "high", mode: "deep-lore", signals: { freshness: 0, momentum: 0, novelty: 90 } }),
        topic({ id: "current", mode: "current", signals: { freshness: 100, momentum: 100, novelty: 100 } }),
      ] as never[],
      [],
    );
    expect(ranked.map(({ topic: item }) => item.id)).toEqual(["high", "low"]);
  });
});
