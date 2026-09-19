import { describe, expect, it } from "vitest";
import { DEFAULT_FOLLOWED_NICHE_IDS, parseStoredPreferences, toggleFollowedNiche } from "./preferences";

describe("local discovery preferences", () => {
  it("falls back when storage is absent, malformed, or unsupported", () => {
    expect(parseStoredPreferences(null)).toEqual(DEFAULT_FOLLOWED_NICHE_IDS);
    expect(parseStoredPreferences("not-json")).toEqual(DEFAULT_FOLLOWED_NICHE_IDS);
    expect(parseStoredPreferences('{"version":2,"followedNicheIds":[]}')).toEqual(DEFAULT_FOLLOWED_NICHE_IDS);
  });

  it("keeps only known, unique niche ids", () => {
    const stored = JSON.stringify({ version: 1, followedNicheIds: ["fragrance", "unknown", "fragrance", "f1"] });
    expect(parseStoredPreferences(stored, new Set(["fragrance", "f1"]))).toEqual(["fragrance", "f1"]);
  });

  it("adds and removes a niche without mutating the original list", () => {
    const original = ["fragrance", "sneakers"];
    expect(toggleFollowedNiche(original, "f1")).toEqual(["fragrance", "sneakers", "f1"]);
    expect(toggleFollowedNiche(original, "fragrance")).toEqual(["sneakers"]);
    expect(original).toEqual(["fragrance", "sneakers"]);
  });
});

