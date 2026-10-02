import { describe, expect, it } from "vitest";
import { cultureManualCaptures } from "../../staging/manual-captures";
import { SEVEN_LANE_STARTERS } from "../backend/editorial/starters";
import { CULTURE_SOURCE_PRESETS } from "../backend/ingestion/source-catalog";
import type { SourceDefinition } from "../backend/ingestion/types";

const sources: SourceDefinition[] = CULTURE_SOURCE_PRESETS.map((preset) => ({
  id: preset.key, name: preset.name, adapterType: preset.adapterType as SourceDefinition["adapterType"], trustTier: preset.trustTier as SourceDefinition["trustTier"],
  locale: preset.locale, region: preset.region, allowlisted: false,
  config: { presetKey: preset.key, domains: preset.domains, originKey: preset.originKey },
}));

describe("seven-lane real manual capture inputs", () => {
  it.each(SEVEN_LANE_STARTERS)("maps both $key receipts to registered origins and the actual publication instant", (starter) => {
    const captures = cultureManualCaptures(starter, sources);
    expect(captures).toHaveLength(2);
    expect(new Set(captures.map((capture) => capture.originKey)).size).toBe(2);
    captures.forEach((capture, index) => {
      expect(capture.sourceDefinitionId).toBe(starter.receipts[index].presetKey);
      expect(capture.url).toBe(starter.receipts[index].url);
      expect(new Date(`${capture.publishedLocal}:00+05:30`).toISOString()).toBe(new Date(starter.receipts[index].publishedAt).toISOString());
      expect(capture.nicheId).toBe(starter.key);
    });
  });
  it("stops before capture when a publisher is missing or origins have been consolidated", () => {
    const starter = SEVEN_LANE_STARTERS[0];
    expect(() => cultureManualCaptures(starter, [])).toThrow("registered");
    const consolidated = sources.map((source) => ({ ...source, config: { ...source.config, originKey: "publisher:one.example" } }));
    expect(() => cultureManualCaptures(starter, consolidated)).toThrow("origins");
  });
});
