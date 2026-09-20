import { describe, expect, it } from "vitest";
import { rankLiveFeed } from "./feed";

const item = (id: string, nicheId: string, heat: number) => ({ id, nicheId, heat });

describe("live feed ordering", () => {
  it("caps followed-niche affinity at ten score points", () => {
    const [ranked] = rankLiveFeed([item("a", "books", 50)], new Set(["books"]));
    expect(ranked.score).toBe(55);
  });

  it("shows at least four available beats in the first ten and prevents three consecutive niches", () => {
    const ranked = rankLiveFeed([
      item("s1", "style", 100), item("s2", "style", 99), item("s3", "style", 98), item("s4", "style", 97),
      item("b1", "books", 80), item("f1", "f1", 79), item("m1", "memes", 78), item("g1", "gaming", 77),
      item("s5", "style", 76), item("s6", "style", 75), item("s7", "style", 74), item("s8", "style", 73),
    ], new Set());

    expect(new Set(ranked.slice(0, 10).map((entry) => entry.item.nicheId)).size).toBeGreaterThanOrEqual(4);
    for (let index = 2; index < ranked.length; index += 1) {
      expect([ranked[index - 2], ranked[index - 1], ranked[index]].every((entry) => entry.item.nicheId === ranked[index].item.nicheId)).toBe(false);
    }
  });
});
