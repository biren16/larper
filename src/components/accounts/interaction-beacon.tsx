"use client";

import { useEffect } from "react";
import { recordInteractionAction } from "@/app/account/actions";

const ANONYMOUS_KEY = "larper:anonymous:v1";

export function InteractionBeacon({ storyId, nicheId }: { storyId: string; nicheId: string }) {
  useEffect(() => {
    let anonymousId: string | null = null;
    try {
      anonymousId = window.localStorage.getItem(ANONYMOUS_KEY);
      if (!anonymousId) {
        anonymousId = crypto.randomUUID();
        window.localStorage.setItem(ANONYMOUS_KEY, anonymousId);
      }
    } catch {
      return;
    }
    void recordInteractionAction(anonymousId, { eventName: "story_open", storyId, nicheId });
  }, [nicheId, storyId]);
  return null;
}
