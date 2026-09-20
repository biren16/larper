import { describe, expect, it } from "vitest";
import type { DiscoveryTopic, Niche, SourceSignal } from "@/domain/discovery/types";
import {
  buildSignalCue,
  getCuriosityAction,
  selectCardKind,
} from "./topic-presentation";

const topic = (overrides: Partial<DiscoveryTopic> = {}): DiscoveryTopic => ({
  id: "topic-1",
  slug: "topic-one",
  nicheId: "sneakers",
  title: "Topic one",
  hook: "A hook",
  summary: "A summary",
  whyItMatters: "Why it matters",
  lore: "The lore",
  beginnerContext: "Beginner context",
  type: "TREND",
  mode: "current",
  publicationFormat: "story",
  lifecycle: "published_story",
  regions: ["global"],
  firstDetectedAt: "2026-09-10T08:00:00.000Z",
  lastUpdatedAt: "2026-09-10T18:00:00.000Z",
  lastCheckedAt: "2026-09-10T18:00:00.000Z",
  publishedAt: "2026-09-10T12:00:00.000Z",
  freshnessLabel: "New this week",
  confidence: 80,
  evidenceSummary: "Two test signals",
  signals: { freshness: 80, momentum: 78, novelty: 70 },
  tags: [],
  relatedTopicIds: [],
  status: "published",
  origin: "seed",
  ...overrides,
} as DiscoveryTopic);

const niche = (overrides: Partial<Niche> = {}): Niche => ({
  id: "sneakers",
  slug: "sneakers",
  name: "Sneakers",
  description: "Description",
  curiosityHook: "Hook",
  parentCategory: "Style",
  relatedNicheIds: [],
  status: "active",
  origin: "seed",
  ...overrides,
});

const signal = (sourceType: SourceSignal["sourceType"], id: string): SourceSignal => ({
  id,
  topicId: "topic-1",
  sourceType,
  sourceName: "Source",
  sourceDefinitionId: `seed:${sourceType}`,
  title: "Signal",
  locale: "en",
  region: "global",
  publishedAt: "2026-09-10T18:00:00.000Z",
  observedAt: "2026-09-10T18:00:00.000Z",
  trustTier: "community",
  availability: "available",
  signalStrength: 80,
  origin: "seed",
});

describe("topic presentation", () => {
  it.each([
    ["MEME", "meme"],
    ["DROP", "drop"],
    ["PRODUCT", "drop"],
    ["COMEBACK", "drop"],
    ["DEBATE", "debate"],
    ["DRAMA", "debate"],
    ["AESTHETIC", "visual"],
    ["LORE", "lore"],
    ["RABBIT_HOLE", "lore"],
    ["TREND", "trend"],
  ] as const)("maps %s topics to the %s card", (type, kind) => {
    expect(selectCardKind(topic({ type }), niche())).toBe(kind);
  });

  it("uses position and food context without changing domain types", () => {
    expect(selectCardKind(topic(), niche(), { lead: true })).toBe("lead");
    expect(selectCardKind(topic(), niche(), { compact: true })).toBe("compact");
    expect(selectCardKind(topic({ nicheId: "cafe-culture" }), niche({ id: "cafe-culture", parentCategory: "Food" }))).toBe("place");
  });

  it("falls back to a trend card for future discovery types", () => {
    expect(selectCardKind(topic({ type: "UNKNOWN" as DiscoveryTopic["type"] }), niche())).toBe("trend");
  });

  it("derives human signal language from real source diversity and momentum", () => {
    expect(buildSignalCue(topic({ signals: { freshness: 90, momentum: 88, novelty: 70 } }), [
      signal("reddit", "r1"),
      signal("youtube", "y1"),
      signal("trend", "t1"),
    ])).toEqual({
      status: "Spiking",
      sourceLabels: ["Reddit ↑", "YouTube ↑"],
      sourceCount: 3,
      crossCommunity: true,
    });
  });

  it("routes curiosity actions to existing context instead of inventing prompts", () => {
    expect(getCuriosityAction(topic({ type: "MEME" }))).toEqual({ label: "WTF is this?", href: "/discover/topic-one#beginner-context" });
    expect(getCuriosityAction(topic({ type: "DEBATE" }))).toEqual({ label: "Why do people care?", href: "/discover/topic-one#why-it-matters" });
    expect(getCuriosityAction(topic({ type: "LORE", mode: "deep-lore" }))).toEqual({ label: "Explain the lore", href: "/discover/topic-one#lore" });
    expect(getCuriosityAction(topic())).toEqual({ label: "Go deeper", href: "/discover/topic-one" });
  });
});
