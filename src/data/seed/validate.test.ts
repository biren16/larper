import { describe, expect, it } from "vitest";
import { validateSeedDataset } from "./validate";

const validDataset = () => ({
  niches: [
    {
      id: "niche-a",
      slug: "niche-a",
      name: "Niche A",
      description: "Description",
      curiosityHook: "Hook",
      parentCategory: "Culture",
      relatedNicheIds: [],
      heroMediaId: "media-a",
      status: "active",
      origin: "seed",
    },
  ],
  topics: [
    {
      id: "topic-a",
      slug: "topic-a",
      nicheId: "niche-a",
      title: "Topic",
      hook: "Hook",
      summary: "Summary",
      whyItMatters: "Why",
      lore: "Lore",
      beginnerContext: "Beginner",
      type: "TREND",
      mode: "current",
      firstDetectedAt: "2026-09-10T00:00:00.000Z",
      lastUpdatedAt: "2026-09-18T00:00:00.000Z",
      publishedAt: "2026-09-12T00:00:00.000Z",
      freshnessLabel: "Picking up",
      signals: { freshness: 80, momentum: 70, novelty: 60 },
      mediaId: "media-a",
      tags: ["tag"],
      relatedTopicIds: [] as string[],
      status: "published",
      origin: "seed",
    },
  ],
  sourceSignals: [
    {
      id: "source-a",
      topicId: "topic-a",
      sourceType: "reddit",
      sourceName: "Community thread",
      title: "Collectors compare notes",
      publishedAt: "2026-09-18T00:00:00.000Z",
      signalStrength: 60,
      origin: "seed",
    },
  ],
  media: [
    { id: "media-a", src: "/media/a.png", alt: "A useful description", width: 100, height: 100 },
  ],
});

describe("seed dataset validation", () => {
  it("accepts a normalized internally consistent dataset", () => {
    expect(validateSeedDataset(validDataset() as never)).toEqual([]);
  });

  it("reports duplicate ids and broken entity relationships", () => {
    const dataset = validDataset();
    dataset.niches.push({ ...dataset.niches[0], slug: "other" });
    dataset.topics[0].nicheId = "missing";
    dataset.topics[0].relatedTopicIds = ["unknown"];
    dataset.sourceSignals[0].topicId = "unknown";

    expect(validateSeedDataset(dataset as never)).toEqual(
      expect.arrayContaining([
        "Duplicate niche id: niche-a",
        "Topic topic-a references missing niche missing",
        "Topic topic-a references missing related topic unknown",
        "Source source-a references missing topic unknown",
      ]),
    );
  });

  it("reports invalid scores, dates, media, alt text, and seed links", () => {
    const dataset = validDataset();
    dataset.topics[0].signals.freshness = 120;
    dataset.topics[0].publishedAt = "not-a-date";
    dataset.topics[0].mediaId = "missing";
    dataset.media[0].alt = "";
    Object.assign(dataset.sourceSignals[0], { sourceUrl: "https://example.com/fabricated" });

    expect(validateSeedDataset(dataset as never)).toEqual(
      expect.arrayContaining([
        "Topic topic-a has freshness outside 0-100",
        "Topic topic-a has invalid publishedAt",
        "Topic topic-a references missing media missing",
        "Media media-a requires alt text",
        "Seed source source-a must not be clickable",
      ]),
    );
  });
});
