"use server";

import { getAuthProviders } from "@/backend/accounts/providers";
import { redirect } from "next/navigation";
import { readSiteUrl, type Environment } from "@/backend/config/env";
import { safeNextPath } from "@/backend/accounts/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function siteUrl() {
  return readSiteUrl(process.env, (process.env.NODE_ENV ?? "development") as Environment);
}

function authError(next: string, message: string): never {
  redirect(`/auth?next=${encodeURIComponent(next)}&error=${encodeURIComponent(message)}`);
}

export async function signInWithGoogle(form: FormData) {
  const next = safeNextPath(String(form.get("next") ?? "/"));
  const providers = await getAuthProviders();
  if (!providers.google) authError(next, "Google sign-in is unavailable. Use an enabled sign-in method below.");
  const client = await createServerSupabaseClient();
  if (!client) authError(next, "Accounts are not configured");
  const result = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true },
  });
  if (result.error || !result.data.url) authError(next, result.error?.message ?? "Google sign-in failed");
  redirect(result.data.url);
}

export async function sendMagicLink(form: FormData) {
  const next = safeNextPath(String(form.get("next") ?? "/"));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) authError(next, "Enter a valid email");
  const client = await createServerSupabaseClient();
  if (!client) authError(next, "Accounts are not configured");
  const result = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (result.error) authError(next, result.error.code === "over_email_send_rate_limit" || result.error.code === "over_request_rate_limit"
    ? "The email sign-in limit has been reached. Wait before requesting another link, or use another enabled sign-in method."
    : result.error.message);
  redirect(`/auth/check-email?next=${encodeURIComponent(next)}`);
}

export async function signOut() {
  const client = await createServerSupabaseClient();
  if (client) await client.auth.signOut();
  redirect("/");
}
