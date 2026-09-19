"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_FOLLOWED_NICHE_IDS,
  PREFERENCES_STORAGE_KEY,
  parseStoredPreferences,
  toggleFollowedNiche,
} from "@/domain/preferences/preferences";

interface FollowedNichesContextValue {
  followedNicheIds: string[];
  isFollowed: (id: string) => boolean;
  toggleFollow: (id: string, name: string) => void;
}

const FollowedNichesContext = createContext<FollowedNichesContextValue | null>(null);

export function FollowedNichesProvider({ children, knownNicheIds }: { children: ReactNode; knownNicheIds: string[] }) {
  const knownIds = useMemo(() => new Set(knownNicheIds), [knownNicheIds]);
  const [followedNicheIds, setFollowedNicheIds] = useState(() =>
    DEFAULT_FOLLOWED_NICHE_IDS.filter((id) => knownIds.has(id)),
  );
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setFollowedNicheIds(parseStoredPreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY), knownIds));
      } catch {
        setFollowedNicheIds(DEFAULT_FOLLOWED_NICHE_IDS.filter((id) => knownIds.has(id)));
      }
    });
  }, [knownIds]);

  const toggleFollow = useCallback((id: string, name: string) => {
    const next = toggleFollowedNiche(followedNicheIds, id);
    const added = next.includes(id);
    setFollowedNicheIds(next);
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ version: 1, followedNicheIds: next }));
    } catch {
      // Preferences still work for this session when storage is unavailable.
    }
    setAnnouncement(`${name} ${added ? "added to" : "removed from"} Your Larps`);
  }, [followedNicheIds]);

  const value = useMemo<FollowedNichesContextValue>(() => ({
    followedNicheIds,
    isFollowed: (id) => followedNicheIds.includes(id),
    toggleFollow,
  }), [followedNicheIds, toggleFollow]);

  return (
    <FollowedNichesContext.Provider value={value}>
      {children}
      <p className="srOnly" role="status" aria-live="polite">{announcement}</p>
    </FollowedNichesContext.Provider>
  );
}

export function useFollowedNiches(): FollowedNichesContextValue {
  const context = useContext(FollowedNichesContext);
  if (!context) throw new Error("useFollowedNiches must be used inside FollowedNichesProvider");
  return context;
}
