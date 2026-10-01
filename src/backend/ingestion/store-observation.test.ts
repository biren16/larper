import { describe, expect, it } from "vitest";
import { persistObservation, type ObservationStore } from "./store-observation";

type Signal = {
  source_definition_id: string;
  canonical_url: string;
  observed_at: string;
  metrics: Record<string, number>;
};

describe("persistObservation", () => {
  it("keeps the first observation time while recording a new metric snapshot on a repeat poll", async () => {
    let saved: (Signal & { id: string }) | null = null;
    const snapshots: Array<{ at: string; views: number }> = [];
    const store: ObservationStore<Signal> = {
      find: async () => saved && { id: saved.id, observed_at: saved.observed_at },
      upsert: async (signal) => {
        saved = { ...signal, id: "signal-1" };
        return { id: "signal-1" };
      },
      appendSnapshot: async (_id, metrics, at) => {
        snapshots.push({ at, views: metrics.views });
      },
    };

    expect(await persistObservation(store, {
      source_definition_id: "source-1", canonical_url: "https://example.com/story",
      observed_at: "2026-09-20T09:00:00Z", metrics: { views: 100 },
    }, "2026-09-20T09:00:00Z")).toBe(true);
    expect(await persistObservation(store, {
      source_definition_id: "source-1", canonical_url: "https://example.com/story",
      observed_at: "2026-09-21T09:00:00Z", metrics: { views: 180 },
    }, "2026-09-21T09:00:00Z")).toBe(false);

    expect(saved).toMatchObject({ observed_at: "2026-09-20T09:00:00Z" });
    expect(snapshots).toEqual([
      { at: "2026-09-20T09:00:00Z", views: 100 },
      { at: "2026-09-21T09:00:00Z", views: 180 },
    ]);
  });
});
