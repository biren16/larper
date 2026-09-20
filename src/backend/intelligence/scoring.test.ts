import { describe, expect, it } from "vitest";
import { calculateConfidence, calculateHeat, calculateMomentum } from "./scoring";

describe("candidate scoring", () => {
  it("uses the approved six-factor heat weights", () => {
    expect(calculateHeat({
      momentum: 90,
      sourceDiversity: 80,
      freshness: 70,
      novelty: 60,
      indiaRelevance: 50,
      crossover: 40,
    })).toBe(71.5);
  });

  it("calculates acceleration against a source baseline", () => {
    expect(calculateMomentum([
      { capturedAt: "2026-09-20T06:00:00.000Z", metrics: { views: 100 } },
      { capturedAt: "2026-09-20T09:00:00.000Z", metrics: { views: 700 } },
    ], 100)).toBe(100);
  });

  it("does not inflate momentum when metrics are missing or fall", () => {
    expect(calculateMomentum([{ capturedAt: "2026-09-20T06:00:00.000Z", metrics: {} }], 100)).toBe(0);
    expect(calculateMomentum([
      { capturedAt: "2026-09-20T06:00:00.000Z", metrics: { likes: 200 } },
      { capturedAt: "2026-09-20T09:00:00.000Z", metrics: { likes: 100 } },
    ], 10)).toBe(0);
  });

  it("rewards independent allowlisted sources and cluster coherence", () => {
    expect(calculateConfidence({ independentSourceCount: 3, allowlistedSourceCount: 2, coherence: 80, temporalCoherence: 90 })).toBe(83);
  });
});
