import { retry } from "./retry";
import type { AdapterType, IngestionSummary, NormalizedSignal, SourceDefinition } from "./types";

export type SourceAdapter = (source: SourceDefinition) => Promise<NormalizedSignal[]>;
export type AdapterRegistry = Partial<Record<AdapterType, SourceAdapter>>;

export interface IngestionStore {
  beginRun(trigger: string): Promise<string>;
  listDueSources(): Promise<SourceDefinition[]>;
  upsertRawSignal(signal: NormalizedSignal): Promise<{ id: string; inserted: boolean }>;
  appendSnapshot(rawSignalId: string, metrics: Record<string, number>, capturedAt: string): Promise<void>;
  recordFailure(sourceId: string, runId: string, error: unknown): Promise<void>;
  completeRun(runId: string, summary: IngestionSummary): Promise<void>;
}

export function deduplicateSignals(signals: NormalizedSignal[]): NormalizedSignal[] {
  const unique = new Map<string, NormalizedSignal>();
  for (const signal of signals) unique.set(`${signal.sourceDefinitionId}:${signal.canonicalUrl}`, signal);
  return [...unique.values()];
}

export async function runIngestion(
  store: IngestionStore,
  adapters: AdapterRegistry,
  trigger: string,
): Promise<IngestionSummary> {
  const runId = await store.beginRun(trigger);
  const sources = await store.listDueSources();
  let insertedCount = 0;
  let errorCount = 0;

  for (const source of sources) {
    const adapter = adapters[source.adapterType];
    if (!adapter) {
      errorCount += 1;
      await store.recordFailure(source.id, runId, new Error(`No ${source.adapterType} adapter registered`));
      continue;
    }
    try {
      const signals = deduplicateSignals(await retry(() => adapter(source), { attempts: 3, delayMs: 250 }));
      for (const signal of signals) {
        const stored = await store.upsertRawSignal(signal);
        if (stored.inserted) insertedCount += 1;
        await store.appendSnapshot(stored.id, signal.metrics, signal.observedAt);
      }
    } catch (error) {
      errorCount += 1;
      await store.recordFailure(source.id, runId, error);
    }
  }

  const summary: IngestionSummary = {
    status: errorCount === 0 ? "succeeded" : errorCount === sources.length ? "failed" : "partial",
    sourceCount: sources.length,
    insertedCount,
    errorCount,
  };
  await store.completeRun(runId, summary);
  return summary;
}
