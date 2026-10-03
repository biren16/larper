import { NextResponse } from "next/server";
import { safeNextPath } from "@/backend/accounts/redirect";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));
  const client = await createServerSupabaseClient();
  if (client && !(code && tokenHash)) {
    const result = code
      ? await client.auth.exchangeCodeForSession(code)
      : tokenHash && type === "email"
        ? await client.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
        : null;
    if (result && !result.error) {
      const destination = new URL(next, url.origin);
      return privateRedirect(destination.origin === url.origin ? destination : new URL("/", url.origin));
    }
  }
  const failure = new URL("/auth?error=That+sign-in+link+could+not+be+verified", url.origin);
  if (next !== "/") failure.searchParams.set("next", next);
  return privateRedirect(failure);
}

function privateRedirect(destination: URL) {
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
