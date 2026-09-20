import { describe, expect, it } from "vitest";
import { seedRepository } from "@/data/seed/repository";

describe("live discovery contracts", () => {
  it("carries publication and provenance metadata on every seed topic", async () => {
    const topics = await seedRepository.listTopics();

    expect(topics.length).toBeGreaterThan(0);
    for (const topic of topics) {
      expect(topic.publicationFormat).toBe("story");
      expect(topic.lifecycle).toBe("published_story");
      expect(topic.regions).toEqual(["global"]);
      expect(topic.confidence).toBeGreaterThanOrEqual(0);
      expect(topic.confidence).toBeLessThanOrEqual(100);
      expect(Number.isFinite(Date.parse(topic.lastCheckedAt))).toBe(true);
      expect(topic.evidenceSummary.length).toBeGreaterThan(0);
    }
  });

  it("carries source trust, locale, observation, and availability metadata", async () => {
    const [topic] = await seedRepository.listTopics();
    const signals = await seedRepository.listSignalsForTopic(topic.id);

    expect(signals.length).toBeGreaterThan(0);
    for (const signal of signals) {
      expect(signal.sourceDefinitionId).toBeTruthy();
      expect(signal.locale).toBe("en");
      expect(signal.region).toBe("global");
      expect(signal.trustTier).toBe("community");
      expect(signal.availability).toBe("available");
      expect(Number.isFinite(Date.parse(signal.observedAt))).toBe(true);
    }
  });

  it("paginates current topics deterministically", async () => {
    const first = await seedRepository.listCurrentTopicsPage({ limit: 3 });
    const second = await seedRepository.listCurrentTopicsPage({ limit: 3, cursor: first.nextCursor });

    expect(first.items).toHaveLength(3);
    expect(second.items).toHaveLength(3);
    expect(first.items.map((item) => item.id)).not.toEqual(second.items.map((item) => item.id));
  });
});
