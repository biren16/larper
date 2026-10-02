import { describe, expect, it } from "vitest";
import { parseFeed } from "./rss";

const source = {
  id: "feed-1",
  name: "Culture Desk",
  adapterType: "rss" as const,
  trustTier: "publication" as const,
  locale: "en-IN",
  region: "india",
  allowlisted: true,
};

describe("parseFeed", () => {
  it("normalizes RSS items and strips tracking URLs", () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Desk</title><item><guid>one</guid><title> Racing books move beyond BookTok </title><link>https://example.com/books/?utm_source=rss</link><description><![CDATA[Readers cross over.]]></description><pubDate>Sat, 20 Sep 2026 09:00:00 GMT</pubDate></item></channel></rss>`;
    const [signal] = parseFeed(xml, source, "2026-09-20T10:00:00.000Z");

    expect(signal).toMatchObject({
      externalId: "one",
      title: "Racing books move beyond BookTok",
      canonicalUrl: "https://example.com/books",
      body: "Readers cross over.",
      locale: "en-IN",
      region: "india",
      trustTier: "publication",
    });
  });

  it("normalizes Atom entries", () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>tag:example,1</id><title>Brainrot phrase crosses feeds</title><link href="https://example.com/brainrot"/><updated>2026-09-20T09:00:00Z</updated><summary>Context travels.</summary></entry></feed>`;
    expect(parseFeed(xml, source, "2026-09-20T10:00:00.000Z")[0]).toMatchObject({
      externalId: "tag:example,1",
      canonicalUrl: "https://example.com/brainrot",
      title: "Brainrot phrase crosses feeds",
    });
  });

  it("rejects malformed feeds rather than inserting empty evidence", () => {
    expect(() => parseFeed("not xml", source, "2026-09-20T10:00:00.000Z")).toThrow("valid RSS or Atom");
  });

  it("selects the Atom article link instead of self or enclosure links", () => {
    const xml = `<feed><entry><title><![CDATA[Archive style]]></title><link rel="self" href="https://example.com/api/1"/><link rel="enclosure" href="https://example.com/image.jpg"/><link rel="alternate" type="text/html" href="https://example.com/archive?utm_source=feed"/><updated>not a date</updated><author><name>A Writer</name></author><summary><![CDATA[<p>Context, not a copied image.</p>]]></summary></entry></feed>`;
    expect(parseFeed(xml, source, "2026-10-02T10:00:00.000Z")[0]).toMatchObject({
      canonicalUrl: "https://example.com/archive", title: "Archive style", author: "A Writer",
      body: "Context, not a copied image.", publishedAt: "2026-10-02T10:00:00.000Z",
    });
  });

  it("rejects feeds whose entries cannot produce any usable evidence", () => {
    expect(() => parseFeed(`<rss><channel><item><title>No link</title></item></channel></rss>`, source, "2026-10-02T10:00:00Z")).toThrow("usable");
  });
});
