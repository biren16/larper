import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthProviders } from "./providers";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("project sign-in methods", () => {
  it("only offers providers explicitly enabled by this project's Auth settings", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stage.example"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    const fetcher = vi.fn(async () => Response.json({external:{google:false,email:true}})); vi.stubGlobal("fetch", fetcher);
    expect(await getAuthProviders()).toEqual({google:false,email:true});
    expect(fetcher).toHaveBeenCalledWith("https://stage.example/auth/v1/settings",expect.objectContaining({headers:{apikey:"public-test-key"},cache:"no-store"}));
  });
  it("does not advertise unusable methods when settings fail", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stage.example"); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    vi.stubGlobal("fetch", async () => {throw new Error("offline");});
    expect(await getAuthProviders()).toEqual({google:false,email:false});
  });
});
