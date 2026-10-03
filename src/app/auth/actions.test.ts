import { beforeEach, describe, expect, it, vi } from "vitest";
const client = { auth: { signInWithOtp: vi.fn(), signInWithOAuth: vi.fn() } };
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: async () => client }));
vi.mock("@/backend/accounts/providers", () => ({ getAuthProviders: async () => ({ google: false, email: true }) }));
import { sendMagicLink, signInWithGoogle } from "./actions";
describe("login recovery", () => {
  beforeEach(() => { vi.clearAllMocks(); client.auth.signInWithOAuth.mockResolvedValue({data:{url:"https://provider.example"},error:null}); process.env.NEXT_PUBLIC_SITE_URL = "https://app.example"; });
  it("keeps the destination and gives a useful email quota error", async () => {
    client.auth.signInWithOtp.mockResolvedValue({ error: { code: "over_email_send_rate_limit", message: "email rate limit exceeded" } });
    const form = new FormData(); form.set("email", "founder@example.com"); form.set("next", "/studio/starters");
    await expect(sendMagicLink(form)).rejects.toThrow(/next=%2Fstudio%2Fstarters.*email.*limit/i);
  });
  it("retains the destination on invalid email", async () => {
    const form = new FormData(); form.set("email", "bad"); form.set("next", "/studio");
    await expect(sendMagicLink(form)).rejects.toThrow(/next=%2Fstudio/);
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
  });
  it("does not send users to a disabled Google provider", async () => {
    const form = new FormData(); form.set("next", "/studio");
    await expect(signInWithGoogle(form)).rejects.toThrow(/next=%2Fstudio.*Google/);
    expect(client.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
});
