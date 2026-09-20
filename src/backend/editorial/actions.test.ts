import { describe, expect, it, vi } from "vitest";
import { createEditorialActions } from "./actions";

describe("editorial action factory", () => {
  it("re-resolves the actor and validates form input before publishing", async () => {
    const getActor = vi.fn(async () => ({ id: "editor-1", email: "founder@example.com", role: "founder" as const }));
    const publishStory = vi.fn(async () => ({ storyId: "story-1", revision: 1 }));
    const actions = createEditorialActions({
      getActor,
      now: () => "2026-09-20T10:00:00.000Z",
      service: { publishStory } as never,
    });
    const form = new FormData();
    Object.entries({
      candidateId: "cluster-1", nicheId: "books", slug: "f1-books", title: "F1 books", hook: "Hook", summary: "Summary",
      whyItMatters: "Why", lore: "Lore", beginnerContext: "Context", discoveryType: "TREND", mode: "current", regions: "india,global",
      freshnessLabel: "Moving", evidenceSummary: "Two sources", tags: "books,f1",
    }).forEach(([key, value]) => form.set(key, value));

    await expect(actions.publishStory(form)).resolves.toEqual({ ok: true, storyId: "story-1" });
    expect(getActor).toHaveBeenCalledOnce();
    expect(publishStory).toHaveBeenCalledWith(expect.objectContaining({ id: "editor-1" }), "cluster-1", expect.objectContaining({ regions: ["india", "global"], tags: ["books", "f1"] }));
  });

  it("returns a usable validation error without invoking the service", async () => {
    const publishStory = vi.fn();
    const actions = createEditorialActions({
      getActor: async () => ({ id: "editor-1", email: "founder@example.com", role: "founder" as const }),
      now: () => "2026-09-20T10:00:00.000Z",
      service: { publishStory } as never,
    });
    await expect(actions.publishStory(new FormData())).resolves.toEqual({ ok: false, error: "candidateId is required" });
    expect(publishStory).not.toHaveBeenCalled();
  });
});
