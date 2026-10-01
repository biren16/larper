export interface SourceHealthStore {
  markPolled(sourceId: string, observedAt: string): Promise<void>;
  resolveOpenFailures(sourceId: string, resolvedAt: string): Promise<void>;
}

export async function completeSourcePoll(store: SourceHealthStore, sourceId: string, observedAt: string): Promise<void> {
  await store.markPolled(sourceId, observedAt);
  await store.resolveOpenFailures(sourceId, observedAt);
}
