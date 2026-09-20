"use client";

import { createBrowserClient } from "@supabase/ssr";
import { readPublicSupabaseConfig } from "@/backend/config/env";
import type { Database } from "@/data/postgres/database.types";

export function createBrowserSupabaseClient() {
  const config = readPublicSupabaseConfig(process.env, "development");
  return config ? createBrowserClient<Database>(config.url, config.publishableKey) : null;
}
