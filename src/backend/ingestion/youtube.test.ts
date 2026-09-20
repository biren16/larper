import { describe, expect, it } from "vitest";
import { normalizeYouTubeResponse } from "./youtube";

describe("normalizeYouTubeResponse", () => {
  it("normalizes public video results and numeric metrics", () => {
    const results = normalizeYouTubeResponse({
      items: [{
        id: { videoId: "video-1" },
        snippet: {
          title: "Why the paddock book is everywhere",
          description: "F1 readers explain the crossover.",
          channelTitle: "Grid Library",
          publishedAt: "2026-09-20T08:00:00Z",
        },
        statistics: { viewCount: "12000", likeCount: "900", commentCount: "85" },
      }],
    }, {
      id: "youtube-1",
      name: "Grid watchlist",
      adapterType: "youtube",
      trustTier: "watchlist",
      locale: "en-IN",
      region: "india",
      allowlisted: true,
    }, "2026-09-20T10:00:00.000Z");

    expect(results[0]).toMatchObject({
      externalId: "video-1",
      canonicalUrl: "https://www.youtube.com/watch?v=video-1",
      author: "Grid Library",
      metrics: { views: 12000, likes: 900, comments: 85 },
    });
  });

  it("ignores channel and playlist search results", () => {
    expect(normalizeYouTubeResponse({ items: [{ id: { channelId: "channel-1" }, snippet: {} }] }, {
      id: "youtube-1", name: "Watchlist", adapterType: "youtube", trustTier: "watchlist", locale: "en", region: "global", allowlisted: true,
    }, "2026-09-20T10:00:00.000Z")).toEqual([]);
  });
});
