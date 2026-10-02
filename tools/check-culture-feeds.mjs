import { writeFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
import presets from '../src/backend/ingestion/culture-source-presets.json' with { type: 'json' };
import { FEED_PARSER_OPTIONS, normalizeFeedDocument } from '../src/backend/ingestion/feed-normalizer.ts';

// Read-only publisher checks. Does not register, approve, activate or ingest sources.
const parser = new XMLParser(FEED_PARSER_OPTIONS);
const rows = presets.filter((source) => source.adapterType === 'rss');
const results = new Array(rows.length);
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < rows.length) {
    const index = next++;
    const source = rows[index];
    const checkedAt = new Date().toISOString();
    try {
      const response = await fetch(source.url, { redirect: 'error', headers: { 'user-agent': 'LARPer-Culture-Radar/1.0' }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries = normalizeFeedDocument(parser.parse(await response.text()), checkedAt);
      results[index] = { key: source.key, name: source.name, beat: source.beat, url: source.url, checkedAt, status: 'parsed', entryCount: entries.length, sample: entries.slice(0, 3).map(({ title, canonicalUrl, publishedAt }) => ({ title, canonicalUrl, publishedAt })) };
    } catch (error) {
      results[index] = { key: source.key, name: source.name, beat: source.beat, url: source.url, checkedAt, status: 'failed', error: error.message };
    }
    process.stdout.write(`${source.key}: ${results[index].status}${results[index].entryCount ? ` (${results[index].entryCount})` : `: ${results[index].error}`}\n`);
  }
}));
const report = { checkedAt: new Date().toISOString(), runtime: 'Node shared normalization; not deployed Edge verification', usageApproval: 'Not implied by availability', sources: results };
const output = process.argv[2] ?? 'research/2026-10-02-culture-feed-checks.json';
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Report: ${output}\n`);
process.exitCode = results.some((source) => source.status === 'failed') ? 1 : 0;
