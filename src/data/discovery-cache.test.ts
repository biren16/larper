import { describe, expect, it } from "vitest";
import { DISCOVERY_CACHE_TAGS } from "./discovery-cache";

describe("discovery cache tags", () => {
  it("scopes invalidation to public feeds and individual worlds", () => {
    expect(DISCOVERY_CACHE_TAGS.feed).toBe("discovery:feed");
    expect(DISCOVERY_CACHE_TAGS.topic("a-story")).toBe("discovery:topic:a-story");
    expect(DISCOVERY_CACHE_TAGS.niche("books")).toBe("discovery:niche:books");
  });
});
