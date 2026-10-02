import { XMLParser } from "fast-xml-parser";
import { FEED_PARSER_OPTIONS, normalizeFeedDocument } from "./feed-normalizer";
import type { NormalizedSignal, SourceDefinition } from "./types";

const parser = new XMLParser(FEED_PARSER_OPTIONS);

export function parseFeed(xml: string, source: SourceDefinition, observedAt: string): NormalizedSignal[] {
  let parsed: unknown;
  try { parsed = parser.parse(xml); } catch { throw new Error("Source did not return valid RSS or Atom XML"); }
  return normalizeFeedDocument(parsed, observedAt).map((item) => ({
    ...item, sourceDefinitionId: source.id, sourceType: "rss", sourceName: source.name,
    locale: source.locale, region: source.region, observedAt, trustTier: source.trustTier,
    availability: "available", metrics: {}, sensitiveFlags: [],
  }));
}
