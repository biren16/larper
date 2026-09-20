import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("allows local paths and rejects open redirects", () => {
    expect(safeNextPath("/discover/story?from=auth")).toBe("/discover/story?from=auth");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
