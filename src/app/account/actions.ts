"use server";

import { updateTag } from "next/cache";
import { AccountService } from "@/backend/accounts/service";
import { getCurrentAccountUser } from "@/backend/accounts/current-user";
import { SupabaseAccountStore } from "@/backend/accounts/supabase-store";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";

async function service() {
  const userClient = await createServerSupabaseClient();
  if (!userClient) throw new Error("Accounts are not configured");
  return new AccountService(new SupabaseAccountStore(userClient, createServiceSupabaseClient() ?? userClient));
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Account action failed";
}

export async function mergeLocalFollowsAction(localNicheIds: string[]) {
  try {
    const user = await getCurrentAccountUser();
    const followedNicheIds = await (await service()).mergeLocalFollows(user, localNicheIds.slice(0, 100));
    if (user) updateTag(`account:follows:${user.id}`);
    return { ok: true as const, followedNicheIds };
  } catch (error) {
    return { ok: false as const, error: message(error) };
  }
}

export async function syncFollowAction(nicheId: string, followed: boolean) {
  try {
    const user = await getCurrentAccountUser();
    await (await service()).setFollow(user, nicheId, followed);
    if (user) updateTag(`account:follows:${user.id}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: message(error) };
  }
}

export async function setSavedAction(storyId: string, saved: boolean) {
  try {
    const user = await getCurrentAccountUser();
    await (await service()).setSaved(user, storyId, saved);
    if (user) updateTag(`account:saves:${user.id}`);
    return { ok: true as const, saved };
  } catch (error) {
    return { ok: false as const, error: message(error) };
  }
}

export async function recordInteractionAction(anonymousId: string | null, input: { eventName: string; storyId?: string; nicheId?: string }) {
  try {
    await (await service()).recordInteraction(await getCurrentAccountUser(), anonymousId, input);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: message(error) };
  }
}
