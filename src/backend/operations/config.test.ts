import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production operations", () => {
  it("schedules authenticated ingestion every three hours", () => {
    const cron = readFileSync("supabase/migrations/202609200005_ingestion_schedule.sql", "utf8");
    expect(cron).toMatch(/0 \*\/3 \* \* \*/);
    expect(cron).toMatch(/net\.http_post/i);
    expect(cron).toMatch(/ingestion_secret/i);
  });

  it("ships an Edge ingestion function and safe source templates", () => {
    const edge = readFileSync("supabase/functions/ingest/index.ts", "utf8");
    const seed = readFileSync("supabase/seed.sql", "utf8");
    expect(edge).toMatch(/Authorization/i);
    expect(edge).toMatch(/process_unclustered_signals/i);
    expect(seed).toMatch(/Founder manual intake/i);
    expect(seed).toMatch(/active[\s\S]*false/i);
  });

  it("keeps backups encrypted and exercises monthly restoration", () => {
    const workflow = readFileSync(".github/workflows/supabase-backup.yml", "utf8");
    expect(workflow).toMatch(/openssl enc -aes-256-cbc/i);
    expect(workflow).toMatch(/BACKUP_ENCRYPTION_KEY/);
    expect(workflow).toMatch(/restore/i);
    expect(workflow).toMatch(/0 3 1 \* \*/);
  });
});
