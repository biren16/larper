import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/data/postgres/database.types";
import type { AccountStore, StoredInteraction } from "./service";

function fail(operation: string, error: { message: string } | null) {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class SupabaseAccountStore implements AccountStore {
  constructor(
    private readonly userClient: SupabaseClient<Database>,
    private readonly analyticsClient: SupabaseClient<Database> = userClient,
  ) {}

  async filterExistingNicheIds(nicheIds: string[]): Promise<string[]> {
    if (nicheIds.length === 0) return [];
    const result = await this.userClient.from("niches").select("id").in("id", nicheIds).eq("status", "active");
    fail("Validate follows", result.error);
    return (result.data ?? []).map((row) => row.id);
  }

  async listFollowedNicheIds(userId: string): Promise<string[]> {
    const result = await this.userClient.from("follows").select("niche_id").eq("user_id", userId);
    fail("List follows", result.error);
    return (result.data ?? []).map((row) => row.niche_id);
  }
  async addFollows(userId: string, nicheIds: string[]): Promise<void> {
    const result = await this.userClient.from("follows").upsert(nicheIds.map((nicheId) => ({ user_id: userId, niche_id: nicheId })), { onConflict: "user_id,niche_id", ignoreDuplicates: true });
    fail("Merge follows", result.error);
  }
  async setFollow(userId: string, nicheId: string, followed: boolean): Promise<void> {
    const query = this.userClient.from("follows");
    const result = followed
      ? await query.upsert({ user_id: userId, niche_id: nicheId }, { onConflict: "user_id,niche_id" })
      : await query.delete().eq("user_id", userId).eq("niche_id", nicheId);
    fail("Update follow", result.error);
  }
  async isSaved(userId: string, storyId: string): Promise<boolean> {
    const result = await this.userClient.from("saves").select("story_id").eq("user_id", userId).eq("story_id", storyId).maybeSingle();
    fail("Read save", result.error);
    return Boolean(result.data);
  }
  async setSaved(userId: string, storyId: string, saved: boolean): Promise<void> {
    const query = this.userClient.from("saves");
    const result = saved
      ? await query.upsert({ user_id: userId, story_id: storyId }, { onConflict: "user_id,story_id" })
      : await query.delete().eq("user_id", userId).eq("story_id", storyId);
    fail("Update save", result.error);
  }
  async recordInteraction(event: StoredInteraction): Promise<void> {
    const result = await this.analyticsClient.from("interaction_events").insert({
      user_id: event.userId,
      anonymous_id: event.anonymousId,
      event_name: event.eventName,
      story_id: event.storyId ?? null,
      niche_id: event.nicheId ?? null,
      properties: event.properties,
    });
    fail("Record interaction", result.error);
  }
}
