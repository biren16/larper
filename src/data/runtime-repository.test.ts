import { describe, expect, it, vi } from "vitest";
import { seedRepository } from "./seed/repository";
import { createRuntimeDiscoveryRepository } from "./runtime-repository";

describe("runtime discovery repository", () => {
  it("uses deterministic fixtures only when Supabase is absent outside production", () => {
    expect(createRuntimeDiscoveryRepository({ env: {}, environment: "development" })).toBe(seedRepository);
    expect(createRuntimeDiscoveryRepository({ env: {}, environment: "test" })).toBe(seedRepository);
  });

  it("fails closed in production instead of showing fictional signals", () => {
    expect(() => createRuntimeDiscoveryRepository({ env: {}, environment: "production" })).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("constructs a Postgres repository when public Supabase configuration exists", () => {
    const createReader = vi.fn(() => ({}) as never);
    const repository = createRuntimeDiscoveryRepository({
      env: { NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key" },
      environment: "production", createReader,
    });

    expect(repository).not.toBe(seedRepository);
    expect(createReader).toHaveBeenCalledWith({ url: "https://demo.supabase.co", publishableKey: "public-key" });
  });
});
