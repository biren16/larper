import { describe, expect, it } from "vitest";
import { readPublicSupabaseConfig, readServerSupabaseConfig } from "./env";

describe("Supabase environment configuration", () => {
  it("allows local development without Supabase", () => {
    expect(readPublicSupabaseConfig({}, "development")).toBeNull();
    expect(readServerSupabaseConfig({}, "test")).toBeNull();
  });

  it("rejects missing production configuration instead of falling back to seed data", () => {
    expect(() => readPublicSupabaseConfig({}, "production")).toThrow("NEXT_PUBLIC_SUPABASE_URL");
    expect(() => readServerSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co" }, "production"))
      .toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("returns narrow public and privileged server configurations", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
    };

    expect(readPublicSupabaseConfig(env, "production")).toEqual({
      url: "https://demo.supabase.co",
      publishableKey: "publishable",
    });
    expect(readServerSupabaseConfig(env, "production")).toEqual({
      url: "https://demo.supabase.co",
      serviceRoleKey: "secret",
    });
  });
});
