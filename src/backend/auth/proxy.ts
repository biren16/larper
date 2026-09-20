import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readPublicSupabaseConfig, type Environment } from "@/backend/config/env";
import type { Database } from "@/data/postgres/database.types";

export async function refreshAuthSession(request: NextRequest) {
  const environment = (process.env.NODE_ENV ?? "development") as Environment;
  const config = readPublicSupabaseConfig(process.env, environment);
  if (!config) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const client = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await client.auth.getClaims();
  return response;
}
