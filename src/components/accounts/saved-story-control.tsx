import Link from "next/link";
import { AccountService } from "@/backend/accounts/service";
import { getCurrentAccountUser } from "@/backend/accounts/current-user";
import { SupabaseAccountStore } from "@/backend/accounts/supabase-store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SaveButton } from "./save-button";

export async function SavedStoryControl({ storyId, returnPath }: { storyId: string; returnPath: string }) {
  const [user, client] = await Promise.all([getCurrentAccountUser(), createServerSupabaseClient()]);
  if (!user || !client) return <Link href={`/auth?next=${encodeURIComponent(returnPath)}`}>Sign in to save</Link>;
  let saved: boolean;
  try {
    saved = await new AccountService(new SupabaseAccountStore(client)).isSaved(user, storyId);
  } catch (error) {
    console.error("Load saved story state failed", error);
    return null;
  }
  return <SaveButton storyId={storyId} initialSaved={saved} />;
}
