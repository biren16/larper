const TRACKING_KEYS = new Set(["fbclid", "gclid", "igsh", "igshid", "mc_cid", "mc_eid", "si"]);

function isTrackingKey(key: string): boolean {
  return key.toLowerCase().startsWith("utm_") || TRACKING_KEYS.has(key.toLowerCase());
}

export function canonicalizeUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Signal URL must use http or https");
  }

  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean)[0];
    if (!videoId) throw new Error("YouTube share URL is missing a video id");
    url.hostname = "www.youtube.com";
    url.pathname = "/watch";
    url.searchParams.set("v", videoId);
  }

  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingKey(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();

  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  if (url.pathname === "/" && !url.search) url.pathname = "";
  return url.toString();
}


// Shared by Node and Deno. XML parsing remains runtime-specific.
export const FEED_PARSER_OPTIONS = {
  ignoreAttributes: false, attributeNamePrefix: "@", textNodeName: "#text",
  cdataPropName: "#cdata", trimValues: true, parseTagValue: false,
};

export function feedText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) return value.map(feedText).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return feedText(object["#text"] ?? object["#cdata"] ?? object.name ?? "");
  }
  return "";
}

export function feedDate(value: unknown, fallback: string): string {
  const timestamp = Date.parse(feedText(value));
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}

function array(value: unknown): unknown[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function atomLink(value: unknown): string {
  const links = array(value).map(record).filter((item): item is Record<string, unknown> => Boolean(item));
  const article = links.find((link) => (link["@rel"] === "alternate" || !link["@rel"])
    && (!link["@type"] || link["@type"] === "text/html" || link["@type"] === "application/xhtml+xml"));
  return feedText(article?.["@href"]);
}

export function normalizeFeedDocument(parsed: unknown, observedAt: string) {
  const document = record(parsed);
  const channel = record(record(document?.rss)?.channel);
  const atom = record(document?.feed);
  if (!channel && !atom) throw new Error("Source did not return valid RSS or Atom XML");
  const signals = array(channel?.item ?? atom?.entry).flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    const title = feedText(item.title);
    const link = atom ? atomLink(item.link) : feedText(item.link);
    if (!title || !link) return [];
    let canonicalUrl: string;
    try { canonicalUrl = canonicalizeUrl(link); } catch { return []; }
    return [{
      canonicalUrl, title,
      externalId: feedText(item.guid ?? item.id) || undefined,
      author: feedText(item.author ?? item["dc:creator"]) || undefined,
      body: feedText(item.description ?? item.summary ?? item.content).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || undefined,
      publishedAt: feedDate(item.pubDate ?? item.published ?? item.updated, observedAt),
    }];
  });
  if (!signals.length) throw new Error("Feed contained no usable RSS or Atom entries");
  return signals;
}
