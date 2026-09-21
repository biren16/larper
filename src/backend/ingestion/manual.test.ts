import { describe, expect, it } from "vitest";
import { normalizeManualSignal } from "./manual";

describe("normalizeManualSignal", () => {
  it("accepts a curated Instagram URL as corroborating evidence", () => {
    expect(normalizeManualSignal({
      url: "https://www.instagram.com/reel/abc/?igsh=tracking",
      title: "A meme format reaches Indian F1 pages",
      sourceName: "Founder watchlist",
      publishedAt: "2026-09-20T08:00:00.000Z",
      region: "india",
    }, "manual-1", "2026-09-20T10:00:00.000Z")).toMatchObject({
      sourceType: "instagram",
      canonicalUrl: "https://www.instagram.com/reel/abc",
      trustTier: "watchlist",
      availability: "available",
    });
  });

  it("records founder context, visible metrics, and a selected niche", () => {
    expect(normalizeManualSignal({
      platform: "instagram", url: "https://www.instagram.com/reel/abc/", title: "F1 edit format",
      sourceName: "Founder", suggestedNicheId: "f1", visibleMetrics: { likes: "1200", comments: "34" },
      observationNote: "Crossing Indian fan pages", publishedAt: "2026-09-21T09:00:00Z", region: "india",
    }, "manual-1", "2026-09-21T10:00:00Z")).toMatchObject({
      sourceType: "instagram", suggestedNicheId: "f1", metrics: { likes: 1200, comments: 34 }, body: "Crossing Indian fan pages",
    });
  });

  it("rejects a platform that does not match the public URL", () => {
    expect(() => normalizeManualSignal({
      platform: "tiktok", url: "https://www.instagram.com/reel/abc/", title: "Wrong platform", sourceName: "Founder",
      publishedAt: "2026-09-21T09:00:00Z", region: "india",
    }, "manual-1", "2026-09-21T10:00:00Z")).toThrow("does not match");
  });

  it("requires a title and a public http URL", () => {
    expect(() => normalizeManualSignal({ url: "file:///secret", title: " ", sourceName: "Founder", publishedAt: "2026-09-20T08:00:00Z", region: "india" }, "manual-1", "2026-09-20T10:00:00Z"))
      .toThrow();
  });
});
