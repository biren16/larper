"use client";

import { useEffect, useRef } from "react";
import { PREFERENCES_STORAGE_KEY, parseStoredPreferences } from "@/domain/preferences/preferences";
import { useFollowedNiches } from "./followed-niches-provider";

export function PreferenceSync({
  userId,
  merge,
  syncFollow,
}: {
  userId: string;
  merge: (localNicheIds: string[]) => Promise<{ ok: boolean; followedNicheIds?: string[] }>;
  syncFollow?: (nicheId: string, followed: boolean) => Promise<unknown>;
}) {
  const { hydrateFollows, registerAccountSync } = useFollowedNiches();
  const syncedUser = useRef<string | null>(null);

  useEffect(() => {
    registerAccountSync(syncFollow ?? null);
    return () => registerAccountSync(null);
  }, [registerAccountSync, syncFollow]);

  useEffect(() => {
    if (syncedUser.current === userId) return;
    syncedUser.current = userId;
    let local: string[] = [];
    try {
      local = parseStoredPreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
    } catch {
      local = [];
    }
    void merge(local).then((result) => {
      if (result.ok && result.followedNicheIds) hydrateFollows(result.followedNicheIds);
    });
  }, [hydrateFollows, merge, userId]);

  return null;
}
