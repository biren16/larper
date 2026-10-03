import { describe, expect, it } from "vitest";
import { StudioReader } from "./studio-reader";

type Row = Record<string, unknown>;

class Query {
  private maximum: number | null = null;

  constructor(private readonly rows: Row[]) {}

  maybeSingle() { return Promise.resolve({ data: this.rows[0] ?? null, error: null }); }
  select() { return this; }
  in() { return this; }
  neq() { return this; }
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
    { id: "live", name: "Live source", adapter_type: "rss", watchlist_beat: "books", active: true, last_polled_at: "2026-09-21T07:00:00Z", poll_minutes: 180, trust_tier: "publication" },
    { id: "stale", name: "Overdue source", adapter_type: "rss", watchlist_beat: "books", active: true, last_polled_at: "2026-09-20T23:00:00Z", poll_minutes: 180, trust_tier: "publication" },
    { id: "paused", name: "Paused source", adapter_type: "youtube", watchlist_beat: "music", active: false, last_polled_at: "2026-09-20T07:00:00Z", trust_tier: "primary" },
    { id: "attention", name: "Needs attention", adapter_type: "rss", watchlist_beat: "f1", active: true, last_polled_at: "2026-09-21T06:00:00Z", trust_tier: "publication" },
    { id: "waiting", name: "Trends validation", adapter_type: "trend", watchlist_beat: "tech-gaming", active: false, last_polled_at: null, trust_tier: "watchlist" },
    { id: "pending", name: "New feed", adapter_type: "rss", watchlist_beat: "books", active: true, last_polled_at: null, trust_tier: "publication" },
    { id: "manual", name: "Founder intake", adapter_type: "manual", watchlist_beat: "internet-culture", active: true, last_polled_at: null, trust_tier: "watchlist" },
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

const reviewed = { usageReview: { reviewedBy: "founder", reviewedAt: "2026-09-20T00:00:00Z", termsUrl: "https://example.com/terms", basis: "Permitted", notes: "Metadata" } };
fixtures.source_definitions = fixtures.source_definitions.map((source) => ({ ...source, config: reviewed }));

describe("StudioReader", () => {
  it("shows unreviewed active feeds as needing review, never healthy", async () => {
    const data = await new StudioReader(clientFor({ source_definitions: [{ ...fixtures.source_definitions[0], config: {} }] })).sources();
    expect(data.sources[0]).toMatchObject({ status: "review", healthy: false, usageReviewed: false });
  });

  it("reloads every private draft field without retaining publication approval", async () => {
    const story = { id: "story", lifecycle: "reviewing", media_id: "cover", niche_id: "style", slug: "samba-lore", title: "Samba", hook: "Hook", summary: "Summary", why_it_matters: "Why", lore: "Lore", beginner_context: "Context", conversation_line: "Line", discovery_type: "LORE", mode: "deep-lore", regions: ["global"], freshness_label: "Archive", evidence_summary: "Two interviews", tags: ["sneakers", "streetwear"], scheduled_for: null };
    const data = await new StudioReader(clientFor({ ...fixtures, stories: [story] })).candidate("cluster-1");
    expect(data?.draft).toEqual({ mediaId: "cover", nicheId: "style", slug: "samba-lore", title: "Samba", hook: "Hook", summary: "Summary", whyItMatters: "Why", lore: "Lore", beginnerContext: "Context", conversationLine: "Line", discoveryType: "LORE", mode: "deep-lore", regions: ["global"], freshnessLabel: "Archive", evidenceSummary: "Two interviews", tags: ["sneakers", "streetwear"], independentSourcesConfirmed: false });
  });

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

  it("does not label unpolled or manual sources as live feeds", async () => {
    const data = await new StudioReader(clientFor(fixtures), () => Date.parse("2026-09-21T08:00:00Z")).sources();

    expect(data.sources.map(({ id, status, trustTier }) => ({ id, status, trustTier }))).toEqual([
      { id: "live", status: "live", trustTier: "publication" },
      { id: "stale", status: "stale", trustTier: "publication" },
      { id: "paused", status: "paused", trustTier: "primary" },
      { id: "attention", status: "attention", trustTier: "publication" },
      { id: "waiting", status: "waiting", trustTier: "watchlist" },
      { id: "pending", status: "pending", trustTier: "publication" },
      { id: "manual", status: "manual", trustTier: "watchlist" },
    ]);
  });
});

it("shows private working title and niche in dashboard and candidate header", async()=>{
 const data={...fixtures,editorial_working_drafts:[{candidate_id:"cluster-1",revision:2,content:{title:"Working title",nicheId:"books"}}]};
 expect((await new StudioReader(clientFor(data)).dashboard()).candidates[0]).toMatchObject({title:"Working title",nicheName:"Books"});
 expect(await new StudioReader(clientFor(data)).candidate("cluster-1")).toMatchObject({title:"Working title",nicheId:"books"});
});
it('reports publisher origins, stored failure diagnostics and expected polling without guessing',async()=>{
 const fixture={...fixtures,source_definitions:[{id:'same-publisher',name:'Publisher feed',adapter_type:'rss',active:true,config:{...reviewed,url:'https://news.example.com/rss'},poll_minutes:180,last_polled_at:'2026-09-21T08:00:00Z'}],source_failures:[{source_definition_id:'same-publisher',message:'HTTP 403 from publisher',error_code:'HTTP_403',occurred_at:'2026-09-21T09:00:00Z'}],raw_signals:[{id:'signal-1',source_definition_id:'same-publisher',title:'Receipt',availability:'available'}]};
 const reader=new StudioReader(clientFor(fixture));
 const sources=await reader.sources();
 expect(sources.sources[0]).toMatchObject({expectedNextPollAt:'2026-09-21T11:00:00.000Z',failures:[{message:'HTTP 403 from publisher',code:'HTTP_403',occurredAt:'2026-09-21T09:00:00Z'}]});
 const candidate=await reader.candidate('cluster-1');
 expect(candidate?.evidence[0].originKey).toBe('publisher:news.example.com');
});
