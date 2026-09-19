import { describe, expect, it } from "vitest";
import { seedRepository } from "./repository";

describe("SeedDiscoveryRepository", () => {
  it("provides a varied normalized dataset that passes validation", async () => {
    const [niches, topics, media] = await Promise.all([
      seedRepository.listNiches(),
      seedRepository.listTopics(),
      seedRepository.listMedia(),
    ]);

    expect(niches.length).toBeGreaterThanOrEqual(8);
    expect(niches.length).toBeLessThanOrEqual(10);
    expect(topics.length).toBeGreaterThanOrEqual(20);
    expect(topics.length).toBeLessThanOrEqual(30);
    expect(new Set(topics.map((topic) => topic.type)).size).toBeGreaterThanOrEqual(8);
    expect(media.length).toBeGreaterThanOrEqual(6);
    expect(seedRepository.validationErrors).toEqual([]);
  });

  it("finds only active niches and published topics by slug", async () => {
    expect((await seedRepository.getNicheBySlug("fragrance"))?.name).toBe("Fragrance");
    expect((await seedRepository.getTopicBySlug("the-silver-runner-resurgence"))?.nicheId).toBe("sneakers");
    expect(await seedRepository.getTopicBySlug("missing-topic")).toBeNull();
  });

  it("returns only signals belonging to the requested topic", async () => {
    const signals = await seedRepository.listSignalsForTopic("silver-runners");
    expect(signals.length).toBeGreaterThanOrEqual(2);
    expect(signals.every((signal) => signal.topicId === "silver-runners")).toBe(true);
  });
});

