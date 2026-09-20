import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@5";

type Source = {
  id: string; name: string; adapter_type: "rss" | "youtube" | "manual"; config: Record<string, unknown>;
  trust_tier: string; locale: string; region: string; poll_minutes: number; last_polled_at: string | null;
};
type Signal = {
  source_definition_id: string; canonical_url: string; external_id: string | null; source_type: string;
  source_name: string; author: string | null; title: string; body: string | null; locale: string; region: string;
  published_at: string; observed_at: string; trust_tier: string; availability: "available"; metrics: Record<string, number>;
  sensitive_flags: string[];
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text", trimValues: true });
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

function canonical(value: string) {
  const url = new URL(value);
  url.hash = "";
  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "igsh"].forEach((key) => url.searchParams.delete(key));
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  url.searchParams.sort();
  return url.toString();
}

function publicHttpUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!new Set(["http:", "https:"]).has(url.protocol) || host === "localhost" || host === "::1" || host === "0.0.0.0" || /^(?:127\.|10\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error("Source URL must be public");
  return url;
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return text(record["#text"] ?? "");
  }
  return "";
}

function list<T>(value: T | T[] | undefined): T[] { return value === undefined ? [] : Array.isArray(value) ? value : [value]; }
function iso(value: unknown, fallback: string) { const parsed = Date.parse(text(value)); return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback; }

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
  const parsed = parser.parse(await fetched.text()) as Record<string, unknown>;
  const channel = parsed.rss && typeof parsed.rss === "object" ? (parsed.rss as Record<string, unknown>).channel as Record<string, unknown> : undefined;
  const atom = parsed.feed && typeof parsed.feed === "object" ? parsed.feed as Record<string, unknown> : undefined;
  if (!channel && !atom) throw new Error("Invalid RSS or Atom document");
  return list<Record<string, unknown>>(channel?.item as Record<string, unknown> | Record<string, unknown>[] | undefined ?? atom?.entry as Record<string, unknown> | Record<string, unknown>[] | undefined).flatMap((item) => {
    const linkValue = atom && item.link && typeof item.link === "object" ? (item.link as Record<string, unknown>)["@href"] : item.link;
    const url = text(linkValue); const title = text(item.title);
    if (!url || !title) return [];
    return [{
      source_definition_id: source.id, canonical_url: canonical(url), external_id: text(item.guid ?? item.id) || null,
      source_type: "rss", source_name: source.name, author: text(item.author) || null, title,
      body: text(item.description ?? item.summary ?? item.content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null,
      locale: source.locale, region: source.region, published_at: iso(item.pubDate ?? item.published ?? item.updated, observedAt),
      observed_at: observedAt, trust_tier: source.trust_tier, availability: "available" as const, metrics: {}, sensitive_flags: sensitiveFlags(`${title} ${text(item.description ?? item.summary ?? item.content)}`),
    }];
  });
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
  const startedAt = new Date().toISOString();
  const begun = await database.from("ingestion_runs").insert({ trigger: "supabase_cron", status: "running", started_at: startedAt }).select("id").single();
  if (begun.error) return response({ status: "failed", error: "Could not start ingestion run" }, 500);
  const runId = begun.data.id;
  const sourceResult = await database.from("source_definitions").select("*").eq("active", true).neq("adapter_type", "manual");
  if (sourceResult.error) return response({ status: "failed", error: "Could not load source registry" }, 500);
  const now = Date.now();
  const due = (sourceResult.data as Source[]).filter((source) => !source.last_polled_at || now - Date.parse(source.last_polled_at) >= source.poll_minutes * 60_000);
  let insertedCount = 0; let errorCount = 0;
  for (const source of due) {
    try {
      const observedAt = new Date().toISOString();
      const signals = source.adapter_type === "rss" ? await rssSignals(source, observedAt) : await youtubeSignals(source, observedAt, Deno.env.get("YOUTUBE_API_KEY") ?? "");
      const unique = new Map(signals.map((signal) => [`${signal.source_definition_id}:${signal.canonical_url}`, signal]));
      for (const signal of unique.values()) {
        const existing = await database.from("raw_signals").select("id").eq("source_definition_id", signal.source_definition_id).eq("canonical_url", signal.canonical_url).maybeSingle();
        if (existing.error) throw existing.error;
        const stored = await database.from("raw_signals").upsert(signal, { onConflict: "source_definition_id,canonical_url" }).select("id").single();
        if (stored.error) throw stored.error;
        if (!existing.data) insertedCount += 1;
        const snapshot = await database.from("signal_snapshots").upsert({ raw_signal_id: stored.data.id, metrics: signal.metrics, captured_at: observedAt }, { onConflict: "raw_signal_id,captured_at" });
        if (snapshot.error) throw snapshot.error;
      }
      await database.from("source_definitions").update({ last_polled_at: observedAt, updated_at: observedAt }).eq("id", source.id);
    } catch (caught) {
      errorCount += 1;
      const message = caught instanceof Error ? caught.message : "Unknown source failure";
      await database.from("source_failures").insert({ source_definition_id: source.id, ingestion_run_id: runId, error_code: "adapter_failed", message: message.slice(0, 500), retryable: true });
    }
  }
  const processed = await database.rpc("process_unclustered_signals");
  if (processed.error) errorCount += 1;
  const status = errorCount === 0 ? "succeeded" : errorCount >= due.length && due.length > 0 ? "failed" : "partial";
  await database.from("ingestion_runs").update({ status, finished_at: new Date().toISOString(), source_count: due.length, inserted_count: insertedCount, error_count: errorCount, details: { processedClusters: processed.data ?? 0 } }).eq("id", runId);
  return response({ status, sourceCount: due.length, insertedCount, errorCount, processedSignals: processed.data ?? 0 });
});
