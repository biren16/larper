import { describe, expect, it } from "vitest";
import * as sourceRouting from "./source-url";

const { isPublicSourceUrl } = sourceRouting;

describe("source URL safety", () => {
  it("accepts public HTTPS feeds and rejects local or private network targets", () => {
    expect(isPublicSourceUrl("https://culture.example/feed.xml")).toBe(true);
    expect(isPublicSourceUrl("http://127.0.0.1/admin")).toBe(false);
    expect(isPublicSourceUrl("http://10.0.0.8/feed")).toBe(false);
    expect(isPublicSourceUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isPublicSourceUrl("file:///etc/passwd")).toBe(false);
  });
});

describe("watchlist routing", () => {
  it("routes the screen-culture beat directly to the screen-culture niche", () => {
    const suggestedNicheForWatchlistBeat = (sourceRouting as Record<string, unknown>).suggestedNicheForWatchlistBeat as ((beat: string | null) => string | undefined) | undefined;

    expect(suggestedNicheForWatchlistBeat?.("screen-culture")).toBe("screen-culture");
  });
});
