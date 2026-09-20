import { describe, expect, it } from "vitest";
import { assignSignal, similarity } from "./clustering";

describe("rule-based topic clustering", () => {
  it("matches shared distinctive phrases despite punctuation and stop words", () => {
    expect(similarity("Why F1 romance books are everywhere", "F1 romance book crosses into racing fandom")).toBeGreaterThan(0.35);
  });

  it("keeps unrelated niche signals apart", () => {
    expect(similarity("F1 romance books are everywhere", "Violet leaf fragrances smell metallic")).toBeLessThan(0.2);
  });

  it("assigns to the best eligible cluster with auditable reasons", () => {
    const result = assignSignal("F1 romance book edits are everywhere", [
      { id: "fragrance", title: "Metallic violet leaf perfume", normalizedTerms: ["metallic", "violet", "leaf", "perfume"] },
      { id: "books", title: "F1 romance books cross fandoms", normalizedTerms: ["f1", "romance", "books", "cross", "fandoms"] },
    ]);
    expect(result).toMatchObject({ clusterId: "books" });
    expect(result?.reasons).toContain("shared:f1");
    expect(result?.reasons).toContain("shared:romance");
  });
});
