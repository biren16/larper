import { XMLParser } from "npm:fast-xml-parser@5.11.1";
import { FEED_PARSER_OPTIONS, normalizeFeedDocument } from "../../../src/backend/ingestion/feed-normalizer.ts";
import fixtures from "./fixtures/parity.json" with { type: "json" };

Deno.test("Edge feed normalization matches the Node contract fixtures", () => {
  const parser = new XMLParser(FEED_PARSER_OPTIONS);
  for (const fixture of fixtures) {
    const actual = normalizeFeedDocument(parser.parse(fixture.xml), "2026-10-02T09:00:00.000Z");
    if (JSON.stringify(actual) !== JSON.stringify(fixture.expected)) throw new Error(`Normalization mismatch: ${JSON.stringify(actual)}`);
  }
});
