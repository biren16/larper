import { describe, expect, it } from "vitest";
import { mapMediaRow, mapNicheRow, mapSignalRow, mapStoryRow } from "./supabase-reader";

describe("Supabase discovery row mapping", () => {
  it("maps published database stories into live discovery topics", () => {
    expect(mapStoryRow({
      id: "story-1", cluster_id: "cluster-1", niche_id: "books", slug: "romantasy-racing",
      title: "Romantasy found the paddock", hook: "Fast cars, slower burns.", summary: "A summary",
      why_it_matters: "Why it matters", lore: "The lore", beginner_context: "Start here", conversation_line: "Mention the crossover, not just the headline.",
      discovery_type: "TREND", mode: "current", publication_format: "story", lifecycle: "published_story",
      regions: ["IN", "global"], freshness_label: "Checked 20m ago", confidence: 88,
      evidence_summary: "Three independent signals are accelerating.",
      signals: { momentum: 91, sourceDiversity: 80, freshness: 85, novelty: 77, indiaRelevance: 70, crossover: 82 },
      media_id: "media-1", tags: ["books", "f1"], related_story_ids: ["story-2"],
      first_detected_at: "2026-09-20T06:00:00.000Z", last_updated_at: "2026-09-20T09:00:00.000Z",
      last_checked_at: "2026-09-20T09:15:00.000Z", published_at: "2026-09-20T09:05:00.000Z",
    })).toMatchObject({
      id: "story-1", nicheId: "books", publicationFormat: "story", lifecycle: "published_story",
      origin: "ingested", status: "published",
      signals: { momentum: 91, sourceDiversity: 80, indiaRelevance: 70 },
    });
  });

  it("maps only public-safe evidence fields into source signals", () => {
    expect(mapSignalRow("story-1", {
      id: "signal-1", source_definition_id: "source-1", canonical_url: "https://example.com/post",
      external_id: "post-1", source_type: "rss", source_name: "Example", author: "Desk", title: "The signal",
      locale: "en-IN", region: "IN", published_at: "2026-09-20T08:00:00.000Z",
      observed_at: "2026-09-20T08:10:00.000Z", trust_tier: "publication", availability: "available",
      metrics: { views: 1200 }, signal_strength: 74,
    })).toEqual(expect.objectContaining({
      topicId: "story-1", canonicalUrl: "https://example.com/post", sourceDefinitionId: "source-1",
      metricSnapshot: { views: 1200 }, origin: "ingested",
    }));
  });

  it("maps niche and media rows without leaking database naming", () => {
    expect(mapNicheRow({ id: "books", slug: "books", name: "Books", description: "Books", curiosity_hook: "Read this", parent_category: "Culture", related_niche_ids: [], hero_media_id: null, status: "active", origin: "ingested" })).toMatchObject({ curiosityHook: "Read this", parentCategory: "Culture" });
    expect(mapMediaRow({ id: "m1", src: "/m.jpg", alt: "Cover", width: 100, height: 120, focal_position: "50% 20%" })).toMatchObject({ focalPosition: "50% 20%" });
  });
});
