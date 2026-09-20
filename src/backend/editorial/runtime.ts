import "server-only";

import { assertEditorialAccess } from "./authorization";
import { EditorialService } from "./service";
import { PostgresEditorialStore } from "./postgres-store";
import { StudioReader } from "./studio-reader";
import { getCurrentAccountUser } from "@/backend/accounts/current-user";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export function founderEmailAllowlist(): ReadonlySet<string> {
  return new Set((process.env.FOUNDER_EMAIL_ALLOWLIST ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export async function getEditorialRuntime() {
  const actor = await getCurrentAccountUser();
  assertEditorialAccess(actor, founderEmailAllowlist());
  const client = createServiceSupabaseClient();
  if (!client) throw new Error("Editorial database is not configured");
  const store = new PostgresEditorialStore(client);
  return { actor, service: new EditorialService(store, founderEmailAllowlist()), reader: new StudioReader(client), client };
}
