import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }));
const createClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: createClient }));
import { GET } from "./route";

const origin = "https://staging.example";
const failure = `${origin}/auth?error=That+sign-in+link+could+not+be+verified`;

describe("authentication callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createClient.mockResolvedValue({ auth });
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    auth.verifyOtp.mockResolvedValue({ error: null });
  });

  it("verifies a one-time email hash through Supabase before opening Studio", async () => {
    const response = await GET(new Request(`${origin}/auth/callback?token_hash=one-time-hash&type=email&next=/studio`));
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "one-time-hash", type: "email" });
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(`${origin}/studio`);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("retains the existing PKCE login flow", async () => {
    const response = await GET(new Request(`${origin}/auth/callback?code=auth-code&next=/studio`));
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(`${origin}/studio`);
  });

  it("rejects an expired or already-used hash without exposing the credential", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { message: "Expired secret-token" } });
    const response = await GET(new Request(`${origin}/auth/callback?token_hash=secret-token&type=email`));
    expect(response.headers.get("location")).toBe(failure);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each(["recovery", "invite", "email_change", "", "signup"])("rejects unsupported token type %s", async (type) => {
    const response = await GET(new Request(`${origin}/auth/callback?token_hash=hash&type=${type}`));
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(failure);
  });

  it("rejects requests mixing a PKCE code and an email hash", async () => {
    const response = await GET(new Request(`${origin}/auth/callback?code=code&token_hash=hash&type=email`));
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(failure);
  });

  it("rejects missing credentials or missing configuration", async () => {
    expect((await GET(new Request(`${origin}/auth/callback`))).headers.get("location")).toBe(failure);
    createClient.mockResolvedValue(null);
    expect((await GET(new Request(`${origin}/auth/callback?token_hash=hash&type=email`))).headers.get("location")).toBe(failure);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("keeps the redirect on the app origin, including backslash and control-character URLs", async () => {
    for (const next of ["https://evil.example", "//evil.example", "/\\evil.example", "/\n/evil.example"]) {
      const response = await GET(new Request(`${origin}/auth/callback?token_hash=hash&type=email&next=${encodeURIComponent(next)}`));
      expect(response.headers.get("location")).toBe(`${origin}/`);
    }
  });
});

it("retains Studio destination when a sign-in link fails", async () => {
  createClient.mockResolvedValue({ auth }); auth.verifyOtp.mockResolvedValue({ error: { message: "Expired" } });
  const response = await GET(new Request(`${origin}/auth/callback?token_hash=expired&type=email&next=/studio/starters`));
  expect(new URL(response.headers.get("location")!).searchParams.get("next")).toBe("/studio/starters");
});
