import { expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import fixtures from "../../../supabase/functions/ingest/fixtures/parity.json";
import { FEED_PARSER_OPTIONS, normalizeFeedDocument } from "./feed-normalizer";
it("Node feed normalization matches the deployed Edge contract fixtures", () => {
  for (const fixture of fixtures) expect(normalizeFeedDocument(new XMLParser(FEED_PARSER_OPTIONS).parse(fixture.xml), "2026-10-02T09:00:00.000Z")).toEqual(fixture.expected);
});
