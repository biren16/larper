import { describe, expect, it } from "vitest";
import { completeSourcePoll } from "./source-health";

describe("completeSourcePoll", () => {
  it("marks a successful poll and resolves old failures", async () => {
    const operations: string[] = [];
    await completeSourcePoll({
      markPolled: async (id, at) => { operations.push(`polled:${id}:${at}`); },
      resolveOpenFailures: async (id, at) => { operations.push(`resolved:${id}:${at}`); },
    }, "source-1", "2026-10-02T00:00:00Z");

    expect(operations).toEqual([
      "polled:source-1:2026-10-02T00:00:00Z",
      "resolved:source-1:2026-10-02T00:00:00Z",
    ]);
  });

  it("keeps failures open when marking the poll fails", async () => {
    let resolved = false;
    await expect(completeSourcePoll({
      markPolled: async () => { throw new Error("database failed"); },
      resolveOpenFailures: async () => { resolved = true; },
    }, "source-1", "2026-10-02T00:00:00Z")).rejects.toThrow("database failed");
    expect(resolved).toBe(false);
  });
});
