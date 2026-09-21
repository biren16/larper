import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202609200001_live_culture.sql", "utf8");
const evidenceMigration = readFileSync("supabase/migrations/202609200002_public_evidence.sql", "utf8");
const editorialMigration = readFileSync("supabase/migrations/202609200003_editorial_publication.sql", "utf8");
const profileProtectionMigration = readFileSync("supabase/migrations/202609200006_profile_role_protection.sql", "utf8");
const schedulingMigration = readFileSync("supabase/migrations/202609200007_story_scheduling.sql", "utf8");
const narrowRadarMigrationPath = "supabase/migrations/202609210004_narrow_culture_radar.sql";
const narrowRadarMigration = existsSync(narrowRadarMigrationPath) ? readFileSync(narrowRadarMigrationPath, "utf8") : "";

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

  it("exposes only evidence attached to published stories", () => {
    expect(evidenceMigration).toMatch(/is_public_story_cluster/i);
    expect(evidenceMigration).toMatch(/published cluster evidence links are publicly readable/i);
    expect(evidenceMigration).toMatch(/availability = 'available'/i);
    expect(evidenceMigration).not.toMatch(/signal_snapshots for select/i);
  });

  it("publishes a story and its immutable revision in one database transaction", () => {
    expect(editorialMigration).toMatch(/function public\.publish_editorial_story/i);
    expect(editorialMigration).toMatch(/insert into public\.story_revisions/i);
    expect(editorialMigration).toMatch(/grant execute .* service_role/i);
    expect(editorialMigration).toMatch(/for update/i);
  });

  it("prevents members from promoting their own editorial role", () => {
    expect(profileProtectionMigration).toMatch(/revoke update on public\.profiles from authenticated/i);
    expect(profileProtectionMigration).toMatch(/grant update\(display_name\)/i);
    expect(profileProtectionMigration).not.toMatch(/grant update\(role\)/i);
  });

  it("publishes founder-scheduled stories through an auditable database job", () => {
    expect(schedulingMigration).toMatch(/scheduled_for timestamptz/i);
    expect(schedulingMigration).toMatch(/publish_due_stories/i);
    expect(schedulingMigration).toMatch(/scheduled_publish/i);
    expect(schedulingMigration).toMatch(/\*\/5 \* \* \* \*/);
  });

  it("adds founder culture-radar fields without weakening publishing gates", () => {
    expect(narrowRadarMigration).toMatch(/watchlist_beat/i);
    expect(narrowRadarMigration).toMatch(/suggested_niche_id/i);
    expect(narrowRadarMigration).toMatch(/editorial_stage/i);
    expect(narrowRadarMigration).toMatch(/conversation_line/i);
    expect(narrowRadarMigration).toMatch(/'trend'/i);
  });
});
