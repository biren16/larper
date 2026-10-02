import { describe, expect, it } from "vitest";
import { SEVEN_LANE_STARTERS, starterForKey } from "./starters";
import { canonicalizeUrl } from "@/backend/ingestion/canonical-url";
import { CULTURE_SOURCE_PRESETS } from "@/backend/ingestion/source-catalog";

describe("researched starters", () => {
  it("has seven complete private drafts with assessed distinct registered origins in order", () => {
    expect(SEVEN_LANE_STARTERS.map((item) => item.key)).toEqual(["music", "screen-culture", "style", "gaming-tech", "internet-culture", "books", "f1"]);
    for (const item of SEVEN_LANE_STARTERS) {
      expect(item.draft.independentSourcesConfirmed).toBe(false);
      expect(item.draft.mode).toBe("deep-lore");
      expect(item.originAssessment.length).toBeGreaterThan(80);
      for (const key of ["hook", "summary", "whyItMatters", "lore", "beginnerContext", "conversationLine", "evidenceSummary"] as const) expect(item.draft[key].length).toBeGreaterThan(20);
      const origins = item.receipts.map((receipt) => {
        const source = CULTURE_SOURCE_PRESETS.find((preset) => preset.key === receipt.presetKey);
        expect(source).toBeDefined();
        expect(source!.domains).toContain(new URL(receipt.url).hostname.replace(/^www\./, ""));
        expect(Number.isFinite(Date.parse(receipt.publishedAt))).toBe(true);
        expect(receipt.assessment).toBeTruthy();
        expect(receipt.url).toBe(canonicalizeUrl(receipt.url));
        return source!.originKey;
      });
      expect(new Set(origins).size).toBe(2);
    }
    expect(starterForKey("style").draft.tags).toEqual(expect.arrayContaining(["sneakers", "streetwear"]));
    expect(() => starterForKey("food")).toThrow("Unknown");
  });
});
