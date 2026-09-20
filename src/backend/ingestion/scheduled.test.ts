import { describe, expect, it } from "vitest";
import { createScheduledIngestionHandler } from "./scheduled";

describe("scheduled ingestion handler", () => {
  it("rejects requests without the configured bearer secret", async () => {
    const handler = createScheduledIngestionHandler({ secret: "top-secret", run: async () => ({ status: "succeeded" as const }) });
    const response = await handler(new Request("https://example.com", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("runs ingestion for an authenticated POST", async () => {
    const handler = createScheduledIngestionHandler({ secret: "top-secret", run: async () => ({ status: "succeeded" as const, insertedCount: 4 }) });
    const response = await handler(new Request("https://example.com", { method: "POST", headers: { authorization: "Bearer top-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "succeeded", insertedCount: 4 });
  });
});
