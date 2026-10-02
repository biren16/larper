import { expect, it } from "vitest";
import { ingestionTrigger } from "./ingestion-trigger";
it("distinguishes cron requests from manual verification requests", () => {
  expect(ingestionTrigger({ trigger: "supabase_cron" })).toBe("supabase_cron");
  for (const input of [undefined, null, {}, { trigger: "staging" }, "supabase_cron"]) expect(ingestionTrigger(input)).toBe("manual");
});
