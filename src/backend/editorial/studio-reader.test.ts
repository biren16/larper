import { describe, expect, it } from "vitest";
import { StudioReader } from "./studio-reader";

type Row = Record<string, unknown>;

class Query {
  private maximum: number | null = null;

  constructor(private readonly rows: Row[]) {}

  select() { return this; }
  in() { return this; }
  is() { return this; }
  eq() { return this; }
  order() { return this; }
  limit(value: number) { this.maximum = value; return this; }
  then(resolve: (value: { data: Row[]; error: null }) => unknown) {
    return Promise.resolve(resolve({ data: this.maximum === null ? this.rows : this.rows.slice(0, this.maximum), error: null }));
  }
}

function clientFor(fixtures: Record<string, Row[]>) {
  return { from: (table: string) => new Query(fixtures[table] ?? []) } as never;
}

const fixtures = {
  topic_clusters: [{ id: "cluster-1", title: "Grid reading lists", niche_id: "books", heat: 82, confidence: 86, state: "detected", editorial_stage: "reviewing", last_checked_at: "2026-09-21T08:00:00Z", sensitive_flags: [] }],
  niches: [{ id: "books", name: "Books" }],
  source_definitions: [
    { id: "live", name: "Live source", adapter_type: "rss", watchlist_beat: "books", active: true, last_polled_at: "2026-09-21T07:00:00Z", trust_tier: "publication" },
    { id: "paused", name: "Paused source", adapter_type: "youtube", watchlist_beat: "music", active: false, last_polled_at: "2026-09-20T07:00:00Z", trust_tier: "primary" },
    { id: "attention", name: "Needs attention", adapter_type: "rss", watchlist_beat: "f1", active: true, last_polled_at: "2026-09-21T06:00:00Z", trust_tier: "publication" },
    { id: "waiting", name: "Trends validation", adapter_type: "trend", watchlist_beat: "tech-gaming", active: false, last_polled_at: null, trust_tier: "watchlist" },
  ],
  source_failures: [{ source_definition_id: "attention" }],
  ingestion_runs: [{ id: "run-1", status: "succeeded", started_at: "2026-09-21T08:00:00Z", inserted_count: 9, error_count: 0 }],
  cluster_signals: [{ cluster_id: "cluster-1", raw_signal_id: "signal-1" }],
  raw_signals: Array.from({ length: 9 }, (_, index) => ({
    id: `signal-${index + 1}`,
    title: `Signal ${index + 1}`,
    canonical_url: `https://example.com/${index + 1}`,
    source_name: index === 0 ? "Live source" : "Elsewhere",
    source_type: "rss",
    suggested_niche_id: index === 0 ? "books" : null,
    region: index === 0 ? "india" : "global",
    observed_at: `2026-09-21T${String(9 - index).padStart(2, "0")}:00:00Z`,
    availability: "available",
  })),
};

describe("StudioReader", () => {
  it("maps the latest eight signals with niche and cluster context", async () => {
    const data = await new StudioReader(clientFor(fixtures)).dashboard();

    expect(data.recentSignals).toHaveLength(8);
    expect(data.recentSignals[0]).toEqual({
      id: "signal-1",
      title: "Signal 1",
      canonicalUrl: "https://example.com/1",
      sourceName: "Live source",
      sourceType: "rss",
      nicheName: "Books",
      region: "india",
      observedAt: "2026-09-21T09:00:00Z",
      availability: "available",
      clusterId: "cluster-1",
    });
    expect(data.candidates[0].sourceCount).toBe(1);
  });

  it("derives live, paused, needs-attention, and waiting source states", async () => {
    const data = await new StudioReader(clientFor(fixtures)).sources();

    expect(data.sources.map(({ id, status, trustTier }) => ({ id, status, trustTier }))).toEqual([
      { id: "live", status: "live", trustTier: "publication" },
      { id: "paused", status: "paused", trustTier: "primary" },
      { id: "attention", status: "attention", trustTier: "publication" },
      { id: "waiting", status: "waiting", trustTier: "watchlist" },
    ]);
  });
});
