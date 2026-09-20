import { describe, expect, it } from "vitest";
import { briefEligibility, detectSensitiveFlags, shouldExpire } from "./publication";

describe("publication intelligence", () => {
  it("allows only high-confidence, high-heat, independently sourced safe briefs", () => {
    expect(briefEligibility({ heat: 70, confidence: 80, independentSourceCount: 2, allowlistedSourceCount: 2, sensitiveFlags: [] })).toEqual({ eligible: true, reasons: [] });
  });

  it("blocks sensitive auto-publication regardless of score", () => {
    expect(briefEligibility({ heat: 100, confidence: 100, independentSourceCount: 5, allowlistedSourceCount: 5, sensitiveFlags: ["minors"] })).toEqual({
      eligible: false,
      reasons: ["sensitive:minors"],
    });
  });

  it("flags safety-sensitive subjects for mandatory review", () => {
    expect(detectSensitiveFlags("Rumour alleges a teenage creator has a health crisis during an election debate"))
      .toEqual(expect.arrayContaining(["allegation", "minors", "health", "politics"]));
  });

  it("expires a current cluster after 36 hours without evidence", () => {
    expect(shouldExpire("2026-09-18T20:00:00.000Z", "2026-09-20T09:00:01.000Z")).toBe(true);
    expect(shouldExpire("2026-09-19T22:00:00.000Z", "2026-09-20T09:00:00.000Z")).toBe(false);
  });
});
