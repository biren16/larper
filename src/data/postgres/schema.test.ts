import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202609200001_live_culture.sql", "utf8");

describe("live culture database migration", () => {
  it.each([
    "source_definitions",
    "raw_signals",
    "signal_snapshots",
    "topic_clusters",
    "cluster_signals",
    "stories",
    "story_revisions",
    "niches",
    "niche_aliases",
    "profiles",
    "follows",
    "saves",
    "interaction_events",
    "ingestion_runs",
    "source_failures",
    "review_events",
  ])("creates %s", (table) => {
    expect(migration).toMatch(new RegExp(`create table(?: if not exists)? public\\.${table}\\b`, "i"));
  });

  it("enables row level security and scopes user-owned records", () => {
    expect(migration).toMatch(/alter table public\.follows enable row level security/i);
    expect(migration).toMatch(/auth\.uid\(\) = user_id/i);
    expect(migration).toMatch(/published content is publicly readable/i);
  });
});
