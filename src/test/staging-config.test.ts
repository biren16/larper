import { describe, expect, it } from "vitest";
import { assertSourceRegistryMatches, readStagingConfig, readStagingInput } from "../../staging/config";

const env = {
  STAGING_APP_URL: "https://staging.example.com",
  STAGING_SUPABASE_URL: "https://staging-project.supabase.co",
  STAGING_PRODUCTION_APP_URL: "https://live.example.com",
  STAGING_PRODUCTION_SUPABASE_URL: "https://live-project.supabase.co",
  STAGING_ALLOW_MUTATIONS: "true",
  STAGING_SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
  STAGING_INGESTION_SECRET: "test-only-secret",
  STAGING_AUTH_STATE: ".auth/staging.json",
  STAGING_INPUT_FILE: ".auth/staging-input.json",
};

const input = {
  feed: { url: "https://publisher.example/feed", beat: "f1", trustTier: "publication" },
  manual: { url: "https://independent.example/report", title: "A real race report", sourceName: "Independent source", publishedAt: "2026-10-02T09:00:00Z", nicheId: "f1", region: "global" },
  story: { title: "A reviewed story", hook: "Hook", summary: "Summary", whyItMatters: "Why", lore: "Lore", beginnerContext: "Context", conversationLine: "Conversation", freshnessLabel: "Today", evidenceSummary: "Two independent reports", independentSourcesConfirmed: true },
};

describe("staging release configuration", () => {
  it("accepts a separate staging target without falling back to live environment variables", () => {
    expect(readStagingConfig(env).appUrl).toBe("https://staging.example.com");
    expect(() => readStagingConfig({ NEXT_PUBLIC_SITE_URL: env.STAGING_APP_URL })).toThrow();
  });

  it.each(["STAGING_APP_URL", "STAGING_SUPABASE_URL"] as const)("refuses production %s even with a trailing slash", (key) => {
    const production = key === "STAGING_APP_URL" ? env.STAGING_PRODUCTION_APP_URL : env.STAGING_PRODUCTION_SUPABASE_URL;
    expect(() => readStagingConfig({ ...env, [key]: `${production}/` })).toThrow(/production/i);
  });

  it.each(["STAGING_ALLOW_MUTATIONS", "STAGING_AUTH_STATE", "STAGING_INPUT_FILE", "STAGING_INGESTION_SECRET", "STAGING_SUPABASE_SERVICE_ROLE_KEY", "STAGING_PRODUCTION_APP_URL", "STAGING_PRODUCTION_SUPABASE_URL"])("refuses missing %s", (key) => {
    expect(() => readStagingConfig({ ...env, [key]: "" })).toThrow();
  });

  it.each(["http://staging.example.com", "https://user:secret@staging.example.com", "https://staging.example.com/path", "https://staging.example.com?token=secret"])("rejects unsafe app origin %s", (url) => {
    expect(() => readStagingConfig({ ...env, STAGING_APP_URL: url })).toThrow();
  });

  it("rejects malformed Supabase and ingestion targets", () => {
    expect(() => readStagingConfig({ ...env, STAGING_SUPABASE_URL: "https://staging-project.supabase.co/path" })).toThrow();
  });
});

describe("staging release editorial inputs", () => {
  it("accepts reviewed real evidence and complete story text", () => {
    expect(readStagingInput(input).manual.nicheId).toBe("f1");
  });
  it("refuses automatic independence confirmation for an unreviewed pair", () => {
    expect(() => readStagingInput({ ...input, story: { ...input.story, independentSourcesConfirmed: false } })).toThrow(/independent/i);
  });
  it("requires a complete story and valid source metadata before mutations", () => {
    expect(() => readStagingInput({ ...input, story: { ...input.story, lore: "" } })).toThrow();
    expect(() => readStagingInput({ ...input, manual: { ...input.manual, publishedAt: "not-a-date" } })).toThrow();
    expect(() => readStagingInput({ ...input, feed: { ...input.feed, beat: "invalid" } })).toThrow();
    expect(() => readStagingInput({ ...input, manual: { ...input.manual, url: "file:///secret" } })).toThrow();
  });
});

describe("deployed Studio database identity", () => {
  it("accepts the same nonempty source registry regardless of ordering", () => {
    expect(() => assertSourceRegistryMatches(["source-b", "source-a"], ["source-a", "source-b"])).not.toThrow();
  });
  it("refuses empty or mismatched registries before creating test records", () => {
    expect(() => assertSourceRegistryMatches([], [])).toThrow();
    expect(() => assertSourceRegistryMatches(["live-source"], ["staging-source"])).toThrow();
    expect(() => assertSourceRegistryMatches(["shared-source"], ["shared-source", "staging-only-source"])).toThrow();
  });
});
