import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CurrentAccountUser {
  id: string;
  email: string;
  displayName: string | null;
  role: "member" | "editor" | "founder";
}

export async function getCurrentAccountUser(): Promise<CurrentAccountUser | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getClaims();
  const subject = data?.claims?.sub;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  if (error || !subject || !email) return null;
  const profile = await client.from("profiles").select("display_name, role").eq("id", subject).maybeSingle();
  if (profile.error) throw new Error(`Load account profile: ${profile.error.message}`);
  const role = profile.data?.role;
  return {
    id: subject,
    email,
    displayName: profile.data?.display_name ?? null,
    role: role === "founder" || role === "editor" ? role : "member",
  };
}
