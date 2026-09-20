import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "./canonical-url";

describe("canonicalizeUrl", () => {
  it("removes fragments and tracking parameters while sorting meaningful parameters", () => {
    expect(canonicalizeUrl("HTTPS://Example.COM/story/?utm_source=feed&b=2&a=1#comments"))
      .toBe("https://example.com/story?a=1&b=2");
  });

  it("normalizes YouTube share URLs to a stable watch URL", () => {
    expect(canonicalizeUrl("https://youtu.be/abc123?si=tracking&t=42"))
      .toBe("https://www.youtube.com/watch?t=42&v=abc123");
  });

  it("rejects non-http protocols", () => {
    expect(() => canonicalizeUrl("javascript:alert(1)")).toThrow("http or https");
  });
});
