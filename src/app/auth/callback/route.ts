import { NextResponse } from "next/server";
import { safeNextPath } from "@/backend/accounts/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const client = await createServerSupabaseClient();
  if (code && client) {
    const result = await client.auth.exchangeCodeForSession(code);
    if (!result.error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/auth?error=That+sign-in+link+could+not+be+verified", url.origin));
}
