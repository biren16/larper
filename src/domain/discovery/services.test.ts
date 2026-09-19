import { describe, expect, it } from "vitest";
import { seedRepository } from "@/data/seed/repository";
import { buildDiscoveryHome, buildNichePage, buildTopicDetail } from "./services";

describe("discovery view-model services", () => {
  it("builds populated home sections with normalized topic context", async () => {
    const home = await buildDiscoveryHome(seedRepository, ["fragrance", "sneakers", "f1", "streetwear"]);

    expect(home.currentTopics.length).toBeGreaterThanOrEqual(10);
    expect(home.deepLore.length).toBeGreaterThanOrEqual(5);
    expect(home.followedNiches.map((niche) => niche.slug)).toEqual(["fragrance", "sneakers", "f1", "streetwear"]);
    expect(home.recommendedNiches.every((niche) => !home.followedNiches.some((followed) => followed.id === niche.id))).toBe(true);
    expect(home.currentTopics[0]).toMatchObject({ niche: expect.any(Object), sources: expect.any(Array), score: expect.any(Number) });
  });

  it("builds topic details with sources, media, and valid related topics", async () => {
    const detail = await buildTopicDetail(seedRepository, "the-silver-runner-resurgence");

    expect(detail?.topic.id).toBe("silver-runners");
    expect(detail?.niche.slug).toBe("sneakers");
    expect(detail?.media?.src).toBe("/media/sneaker-resurgence.png");
    expect(detail?.sources.length).toBeGreaterThanOrEqual(2);
    expect(detail?.relatedTopics.length).toBeGreaterThan(0);
    expect(await buildTopicDetail(seedRepository, "not-real")).toBeNull();
  });

  it("builds niche pages without leaking topics from other niches", async () => {
    const niche = await buildNichePage(seedRepository, "fragrance", ["fragrance"]);

    expect(niche?.isFollowed).toBe(true);
    expect(niche?.currentTopics.every((item) => item.topic.nicheId === "fragrance")).toBe(true);
    expect(niche?.deepLore.every((item) => item.topic.nicheId === "fragrance")).toBe(true);
    expect(niche?.relatedNicheCards.every((item) => item.niche.id && item.media)).toBe(true);
    expect(await buildNichePage(seedRepository, "missing", [])).toBeNull();
  });
});
