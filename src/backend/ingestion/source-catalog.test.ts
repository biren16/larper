import { describe, expect, it } from "vitest";
import { CULTURE_SOURCE_PRESETS, sourceOriginKey, validateUsageReview, hasUsageReview } from "./source-catalog";

describe("culture source registration inputs", () => {
  it("provides the scoped feeds with canonical URLs and regional defaults", () => {
    expect(CULTURE_SOURCE_PRESETS.filter((source) => source.adapterType === "rss")).toHaveLength(21);
    expect(CULTURE_SOURCE_PRESETS.filter((source) => source.adapterType === "manual")).toHaveLength(4);
    expect(CULTURE_SOURCE_PRESETS.find((source) => source.key === "highsnobiety")).toMatchObject({ url: "https://www.highsnobiety.com/feeds/rss", region: "global" });
    expect(CULTURE_SOURCE_PRESETS.find((source) => source.key === "rolling-stone-india")).toMatchObject({ region: "india", locale: "en-IN" });
    expect(CULTURE_SOURCE_PRESETS.find((source) => source.key === "fia")).toMatchObject({ adapterType: "manual", trustTier: "primary" });
    expect(new Set(CULTURE_SOURCE_PRESETS.map((source) => source.beat)).size).toBe(7);
  });

  it("groups feeds from one publication without conflating distinct creator profiles", () => {
    expect(sourceOriginKey({ id: "feed-a", config: { url: "https://www.example.com/music/rss" } })).toBe("publisher:example.com");
    expect(sourceOriginKey({ id: "feed-b", config: { url: "https://example.com/books/rss" } })).toBe("publisher:example.com");
    expect(sourceOriginKey({ id: "creator", config: { originKey: "creator:https://instagram.com/artist" } })).toBe("creator:https://instagram.com/artist");
    expect(sourceOriginKey({ id: "channel", config: { channelId: "UCexample" } })).toBe("creator:https://youtube.com/channel/UCexample");
    expect(sourceOriginKey({ id: "legacy", config: {} })).toBe("source:legacy");
  });

  it("requires an explicit server-attributed usage review before collection", () => {
    expect(hasUsageReview({})).toBe(false);
    expect(() => validateUsageReview({ termsUrl: "https://example.com/terms", basis: "", notes: "" }, "founder", "2026-10-02T10:00:00Z")).toThrow("basis");
    const review = validateUsageReview({ termsUrl: "https://example.com/terms", basis: "Publisher permits feed metadata use", notes: "Links and short summaries only" }, "founder", "2026-10-02T10:00:00Z");
    expect(review.reviewedBy).toBe("founder");
    expect(hasUsageReview({ usageReview: review })).toBe(true);
    expect(hasUsageReview({ usageReview: { ...review, termsUrl: "javascript:alert(1)" } })).toBe(false);
    expect(hasUsageReview({ usageReview: { ...review, reviewedBy: "" } })).toBe(false);
  });
});
