import { XMLParser } from "fast-xml-parser";
import { canonicalizeUrl } from "./canonical-url";
import type { NormalizedSignal, SourceDefinition } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  trimValues: true,
  parseTagValue: false,
});

function array<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return text(object["#text"] ?? object["#cdata"] ?? "");
  }
  return "";
}

function cleanBody(value: unknown): string | undefined {
  const cleaned = text(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function validIso(value: unknown, fallback: string): string {
  const candidate = text(value);
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}

function normalizeItem(item: Record<string, unknown>, source: SourceDefinition, observedAt: string, atom: boolean): NormalizedSignal | null {
  const linkValue = atom && item.link && typeof item.link === "object"
    ? (item.link as Record<string, unknown>)["@href"]
    : item.link;
  const link = text(linkValue);
  const title = text(item.title);
  if (!link || !title) return null;

  return {
    sourceDefinitionId: source.id,
    canonicalUrl: canonicalizeUrl(link),
    externalId: text(item.guid ?? item.id) || undefined,
    sourceType: "rss",
    sourceName: source.name,
    author: text(item.author) || undefined,
    title,
    body: cleanBody(item.description ?? item.summary ?? item.content),
    locale: source.locale,
    region: source.region,
    publishedAt: validIso(item.pubDate ?? item.published ?? item.updated, observedAt),
    observedAt,
    trustTier: source.trustTier,
    availability: "available",
    metrics: {},
    sensitiveFlags: [],
  };
}

export function parseFeed(xml: string, source: SourceDefinition, observedAt: string): NormalizedSignal[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new Error("Source did not return valid RSS or Atom XML");
  }

  const rssChannel = parsed.rss && typeof parsed.rss === "object"
    ? (parsed.rss as Record<string, unknown>).channel as Record<string, unknown> | undefined
    : undefined;
  const atomFeed = parsed.feed && typeof parsed.feed === "object" ? parsed.feed as Record<string, unknown> : undefined;
  const entries = rssChannel ? array(rssChannel.item) : atomFeed ? array(atomFeed.entry) : [];
  if (!rssChannel && !atomFeed) throw new Error("Source did not return valid RSS or Atom XML");

  return entries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => normalizeItem(entry, source, observedAt, Boolean(atomFeed)))
    .filter((entry): entry is NormalizedSignal => Boolean(entry));
}
