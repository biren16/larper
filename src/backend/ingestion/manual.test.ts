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

  it("requires a title and a public http URL", () => {
    expect(() => normalizeManualSignal({ url: "file:///secret", title: " ", sourceName: "Founder", publishedAt: "2026-09-20T08:00:00Z", region: "india" }, "manual-1", "2026-09-20T10:00:00Z"))
      .toThrow();
  });
});
