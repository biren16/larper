import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { readPublicSupabaseConfig, readServerSupabaseConfig, type Environment } from "@/backend/config/env";
import type { Database } from "@/data/postgres/database.types";

function environment(): Environment {
  return (process.env.NODE_ENV ?? "development") as Environment;
}

export async function createServerSupabaseClient() {
  const config = readPublicSupabaseConfig(process.env, environment());
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; src/proxy.ts handles refresh writes.
        }
      },
    },
  });
}

export function createServiceSupabaseClient() {
  const config = readServerSupabaseConfig(process.env, environment());
  if (!config) return null;
  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
