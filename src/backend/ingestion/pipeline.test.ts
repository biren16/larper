import { describe, expect, it } from "vitest";
import { deduplicateSignals, runIngestion } from "./pipeline";
import { retry } from "./retry";
import type { NormalizedSignal, SourceDefinition } from "./types";

const signal = (url: string): NormalizedSignal => ({
  sourceDefinitionId: "feed-1",
  canonicalUrl: url,
  sourceType: "rss",
  sourceName: "Desk",
  title: "Signal",
  locale: "en-IN",
  region: "india",
  publishedAt: "2026-09-20T08:00:00.000Z",
  observedAt: "2026-09-20T10:00:00.000Z",
  trustTier: "publication",
  availability: "available",
  metrics: {},
  sensitiveFlags: [],
});

describe("ingestion reliability", () => {
  it("deduplicates repeated canonical identities", () => {
    expect(deduplicateSignals([signal("https://example.com/a"), signal("https://example.com/a")])).toHaveLength(1);
  });

  it("retries transient operations with an injected delay", async () => {
    let attempts = 0;
    const result = await retry(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("temporary");
      return "ok";
    }, { attempts: 3, delayMs: 1, sleep: async () => undefined });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("records snapshots on repeated runs without duplicating raw signals", async () => {
    const sources: SourceDefinition[] = [{ id: "feed-1", name: "Desk", adapterType: "rss", trustTier: "publication", locale: "en-IN", region: "india", allowlisted: true }];
    const identities = new Set<string>();
    let snapshots = 0;
    const store = {
      beginRun: async () => "run-1",
      listDueSources: async () => sources,
      upsertRawSignal: async (item: NormalizedSignal) => {
        const key = `${item.sourceDefinitionId}:${item.canonicalUrl}`;
        const inserted = !identities.has(key);
        identities.add(key);
        return { id: key, inserted };
      },
      appendSnapshot: async () => { snapshots += 1; },
      recordFailure: async () => undefined,
      completeRun: async () => undefined,
    };
    const adapters = { rss: async () => [signal("https://example.com/a"), signal("https://example.com/a")] };

    await runIngestion(store, adapters, "scheduled");
    await runIngestion(store, adapters, "scheduled");

    expect(identities.size).toBe(1);
    expect(snapshots).toBe(2);
  });
});
