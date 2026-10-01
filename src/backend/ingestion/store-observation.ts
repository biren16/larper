export interface ObservedSignal {
  source_definition_id: string;
  canonical_url: string;
  observed_at: string;
  metrics: Record<string, number>;
}

export interface ObservationStore<T extends ObservedSignal> {
  find(signal: T): Promise<{ id: string; observed_at: string } | null>;
  upsert(signal: T): Promise<{ id: string }>;
  appendSnapshot(id: string, metrics: Record<string, number>, capturedAt: string): Promise<void>;
}

export async function persistObservation<T extends ObservedSignal>(
  store: ObservationStore<T>, signal: T, capturedAt: string,
): Promise<boolean> {
  const existing = await store.find(signal);
  const stored = await store.upsert({ ...signal, observed_at: existing?.observed_at ?? signal.observed_at });
  await store.appendSnapshot(stored.id, signal.metrics, capturedAt);
  return !existing;
}
