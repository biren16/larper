import { describe, expect, it } from "vitest";
import { coverPresentation } from "./cover-presentation";

describe("coverPresentation", () => {
  it("selects a stable subject-aware treatment for a story", () => {
    const context = { title: "Race radio has its own afterlife", niche: "F1", nicheId: "f1", type: "LORE", seed: "story-42" };
    const first = coverPresentation(context);
    expect(first).toMatchObject({ treatment: "motorsport", title: context.title, label: "F1 / LORE" });
    expect(coverPresentation(context)).toEqual(first);
    expect(first.serial).toMatch(/^\d{2}$/);
  });

  it("uses distinct visual languages for screen, music and wider culture", () => {
    expect(coverPresentation({ title: "Film", niche: "Screen", nicheId: "screen-culture", type: "DROP", seed: "a" }).treatment).toBe("screen");
    expect(coverPresentation({ title: "Album", niche: "Music", nicheId: "music", type: "DROP", seed: "b" }).treatment).toBe("music");
    expect(coverPresentation({ title: "Book", niche: "Books", nicheId: "books", type: "TREND", seed: "c" }).treatment).toBe("culture");
  });
});
