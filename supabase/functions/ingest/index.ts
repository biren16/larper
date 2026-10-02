import { ingestionTrigger } from "../../../src/backend/ingestion/ingestion-trigger.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5.11.1";
import { FEED_PARSER_OPTIONS, normalizeFeedDocument, feedDate as iso } from "../../../src/backend/ingestion/feed-normalizer.ts";
import { hasUsageReview } from "../../../src/backend/ingestion/source-review.ts";
import { suggestedNicheForWatchlistBeat } from "../../../src/backend/ingestion/source-url.ts";
import { persistObservation } from "../../../src/backend/ingestion/store-observation.ts";
import { completeSourcePoll } from "../../../src/backend/ingestion/source-health.ts";

type Source = {
  id: string; name: string; adapter_type: "rss" | "youtube" | "manual" | "trend"; config: Record<string, unknown>;
  trust_tier: string; locale: string; region: string; poll_minutes: number; last_polled_at: string | null; watchlist_beat: string | null;
};
type Signal = {
  source_definition_id: string; canonical_url: string; external_id: string | null; source_type: string;
  source_name: string; author: string | null; title: string; body: string | null; locale: string; region: string;
  published_at: string; observed_at: string; trust_tier: string; availability: "available"; metrics: Record<string, number>;
  sensitive_flags: string[]; suggested_niche_id: string | null;
};

const parser = new XMLParser(FEED_PARSER_OPTIONS);
const jsonHeaders = { "content-type": "application/json" };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function sameSecret(actual: string, expected: string) {
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

function publicHttpUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!new Set(["http:", "https:"]).has(url.protocol) || host === "localhost" || host === "::1" || host === "0.0.0.0" || /^(?:127\.|10\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error("Source URL must be public");
  return url;
}

function sensitiveFlags(value: string): string[] {
  const normalized = value.toLowerCase();
  const rules: Array<[string, RegExp]> = [
    ["politics", /\b(election|minister|government|political|parliament)\b/],
    ["health", /\b(diagnosis|disease|medical|medicine|mental health)\b/],
    ["allegation", /\b(alleged|allegation|accused|abuse)\b/],
    ["tragedy", /\b(died|death|killed|tragedy|disaster)\b/],
    ["minors", /\b(child|children|minor|teen under)\b/],
    ["identity", /\b(racism|caste|religion|ethnicity|transphobia|homophobia)\b/],
  ];
  return rules.flatMap(([flag, pattern]) => pattern.test(normalized) ? [flag] : []);
}

async function rssSignals(source: Source, observedAt: string): Promise<Signal[]> {
  const feedUrl = String(source.config.url ?? "");
  const approvedUrl = publicHttpUrl(feedUrl);
  const fetched = await fetch(approvedUrl, { headers: { "user-agent": "LARPer-Culture-Radar/1.0" }, signal: AbortSignal.timeout(15000), redirect: "error" });
  if (!fetched.ok) throw new Error(`RSS returned ${fetched.status}`);
  return normalizeFeedDocument(parser.parse(await fetched.text()), observedAt).map((item) => ({
    source_definition_id: source.id, canonical_url: item.canonicalUrl, external_id: item.externalId ?? null,
    source_type: "rss", source_name: source.name, author: item.author ?? null, title: item.title,
    body: item.body ?? null, locale: source.locale, region: source.region,
    published_at: item.publishedAt, observed_at: observedAt, trust_tier: source.trust_tier,
    availability: "available" as const, metrics: {}, sensitive_flags: sensitiveFlags(`${item.title} ${item.body ?? ""}`),
    suggested_niche_id: suggestedNicheForWatchlistBeat(source.watchlist_beat) ?? null,
  }));
}

async function youtubeSignals(source: Source, observedAt: string, apiKey: string): Promise<Signal[]> {
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");
  const query = new URLSearchParams({ part: "snippet", type: "video", maxResults: "25", order: "date", key: apiKey });
  const channelId = String(source.config.channelId ?? "");
  const keyword = String(source.config.query ?? "");
  if (channelId) query.set("channelId", channelId); else if (keyword) query.set("q", keyword); else throw new Error("YouTube source needs channelId or query");
  const search = await fetch(`https://www.googleapis.com/youtube/v3/search?${query}`, { signal: AbortSignal.timeout(15000) });
  if (!search.ok) throw new Error(`YouTube search returned ${search.status}`);
  const payload = await search.json() as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string } }> };
  const items = payload.items ?? [];
  const ids = items.flatMap((item) => item.id?.videoId ? [item.id.videoId] : []);
  const statistics = new Map<string, Record<string, number>>();
  if (ids.length) {
    const statsQuery = new URLSearchParams({ part: "statistics", id: ids.join(","), key: apiKey });
    const stats = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statsQuery}`, { signal: AbortSignal.timeout(15000) });
    if (stats.ok) {
      const statsPayload = await stats.json() as { items?: Array<{ id: string; statistics?: Record<string, string> }> };
      for (const item of statsPayload.items ?? []) statistics.set(item.id, Object.fromEntries(Object.entries(item.statistics ?? {}).flatMap(([key, value]) => Number.isFinite(Number(value)) ? [[key, Number(value)]] : [])));
    }
  }
  return items.flatMap((item) => {
    const videoId = item.id?.videoId; const title = item.snippet?.title?.trim();
    if (!videoId || !title) return [];
    return [{
      source_definition_id: source.id, canonical_url: `https://www.youtube.com/watch?v=${videoId}`, external_id: videoId,
      source_type: "youtube", source_name: source.name, author: item.snippet?.channelTitle?.trim() || null, title,
      body: item.snippet?.description?.trim() || null, locale: source.locale, region: source.region,
      published_at: iso(item.snippet?.publishedAt, observedAt), observed_at: observedAt, trust_tier: source.trust_tier,
      availability: "available" as const, metrics: statistics.get(videoId) ?? {}, sensitive_flags: sensitiveFlags(`${title} ${item.snippet?.description ?? ""}`),
      suggested_niche_id: suggestedNicheForWatchlistBeat(source.watchlist_beat) ?? null,
    }];
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("INGESTION_SECRET") ?? "";
  if (!secret || !sameSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) return response({ error: "Unauthorized" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return response({ status: "failed", error: "Database configuration is missing" }, 500);
  const database = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const trigger = ingestionTrigger(await request.json().catch(() => null));
  const startedAt = new Date().toISOString();
  const begun = await database.from("ingestion_runs").insert({ trigger, status: "running", started_at: startedAt }).select("id").single();
  if (begun.error) return response({ status: "failed", error: "Could not start ingestion run" }, 500);
  const runId = begun.data.id;
  const sourceResult = await database.from("source_definitions").select("*").eq("active", true).in("adapter_type", ["rss", "youtube"]);
  if (sourceResult.error) {
    await database.from("ingestion_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_count: 1, details: { reason: "Could not load source registry" } }).eq("id", runId);
    return response({ status: "failed", error: "Could not load source registry" }, 500);
  }
  const now = Date.now();
  const unreviewedSources = (sourceResult.data as Source[]).filter((source) => !hasUsageReview(source.config)).map((source) => source.id);
  const due = (sourceResult.data as Source[]).filter((source) => hasUsageReview(source.config) && ( !source.last_polled_at || now - Date.parse(source.last_polled_at) >= source.poll_minutes * 60_000));
  let insertedCount = 0; let errorCount = 0;
  for (const source of due) {
    try {
      const observedAt = new Date().toISOString();
      const signals = source.adapter_type === "rss" ? await rssSignals(source, observedAt) : await youtubeSignals(source, observedAt, Deno.env.get("YOUTUBE_API_KEY") ?? "");
      const unique = new Map(signals.map((signal) => [`${signal.source_definition_id}:${signal.canonical_url}`, signal]));
      for (const signal of unique.values()) {
        const inserted = await persistObservation({
          find: async (item) => {
            const result = await database.from("raw_signals").select("id, observed_at").eq("source_definition_id", item.source_definition_id).eq("canonical_url", item.canonical_url).maybeSingle();
            if (result.error) throw result.error;
            return result.data;
          },
          upsert: async (item) => {
            const result = await database.from("raw_signals").upsert(item, { onConflict: "source_definition_id,canonical_url" }).select("id").single();
            if (result.error) throw result.error;
            return result.data;
          },
          appendSnapshot: async (id, metrics, capturedAt) => {
            const result = await database.from("signal_snapshots").upsert({ raw_signal_id: id, metrics, captured_at: capturedAt }, { onConflict: "raw_signal_id,captured_at" });
            if (result.error) throw result.error;
          },
        }, signal, observedAt);
        if (inserted) insertedCount += 1;
      }
      await completeSourcePoll({
        markPolled: async (id, at) => {
          const result = await database.from("source_definitions").update({ last_polled_at: at, updated_at: at }).eq("id", id);
          if (result.error) throw result.error;
        },
        resolveOpenFailures: async (id, at) => {
          const result = await database.from("source_failures").update({ resolved_at: at }).eq("source_definition_id", id).is("resolved_at", null);
          if (result.error) throw result.error;
        },
      }, source.id, observedAt);
    } catch (caught) {
      errorCount += 1;
      const message = caught instanceof Error ? caught.message : "Unknown source failure";
      await database.from("source_failures").insert({ source_definition_id: source.id, ingestion_run_id: runId, error_code: "adapter_failed", message: message.slice(0, 500), retryable: true });
    }
  }
  const processed = await database.rpc("process_unclustered_signals");
  if (processed.error) errorCount += 1;
  const reopened = processed.error ? { data: 0, error: null } : await database.rpc("reopen_stale_current_stories");
  if (reopened.error) errorCount += 1;
  const status = errorCount === 0 ? "succeeded" : errorCount >= due.length && due.length > 0 ? "failed" : "partial";
  await database.from("ingestion_runs").update({ status, finished_at: new Date().toISOString(), source_count: due.length, inserted_count: insertedCount, error_count: errorCount, details: { sourceIds: due.map((source) => source.id), unreviewedSources, processedClusters: processed.data ?? 0, reopenedStories: reopened.data ?? 0 } }).eq("id", runId);
  return response({ status, unreviewedSources, sourceCount: due.length, insertedCount, errorCount, processedSignals: processed.data ?? 0, reopenedStories: reopened.data ?? 0 });
});
