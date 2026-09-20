"use server";

import { redirect } from "next/navigation";
import { readSiteUrl, type Environment } from "@/backend/config/env";
import { safeNextPath } from "@/backend/accounts/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function siteUrl() {
  return readSiteUrl(process.env, (process.env.NODE_ENV ?? "development") as Environment);
}

export async function signInWithGoogle(form: FormData) {
  const client = await createServerSupabaseClient();
  if (!client) redirect("/auth?error=Accounts+are+not+configured");
  const next = safeNextPath(String(form.get("next") ?? "/"));
  const result = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true },
  });
  if (result.error || !result.data.url) redirect(`/auth?error=${encodeURIComponent(result.error?.message ?? "Google sign-in failed")}`);
  redirect(result.data.url);
}

export async function sendMagicLink(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/auth?error=Enter+a+valid+email");
  const client = await createServerSupabaseClient();
  if (!client) redirect("/auth?error=Accounts+are+not+configured");
  const next = safeNextPath(String(form.get("next") ?? "/"));
  const result = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (result.error) redirect(`/auth?error=${encodeURIComponent(result.error.message)}`);
  redirect("/auth/check-email");
}

export async function signOut() {
  const client = await createServerSupabaseClient();
  if (client) await client.auth.signOut();
  redirect("/");
}
