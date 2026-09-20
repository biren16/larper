import { describe, expect, it } from "vitest";
import { assertEditorialAccess } from "./authorization";

describe("editorial authorization", () => {
  const allowlist = new Set(["founder@example.com"]);

  it("requires both an editorial role and an allowlisted email", () => {
    expect(() => assertEditorialAccess({ id: "1", email: "founder@example.com", role: "founder" }, allowlist)).not.toThrow();
    expect(() => assertEditorialAccess({ id: "2", email: "stranger@example.com", role: "founder" }, allowlist)).toThrow("Forbidden");
    expect(() => assertEditorialAccess({ id: "3", email: "founder@example.com", role: "member" }, allowlist)).toThrow("Forbidden");
  });

  it("rejects anonymous access", () => {
    expect(() => assertEditorialAccess(null, allowlist)).toThrow("Unauthorized");
  });
});
