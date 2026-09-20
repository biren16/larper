"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  hydrateFollows: (ids: string[]) => void;
  registerAccountSync: (sync: ((id: string, followed: boolean) => Promise<unknown>) | null) => void;
}

const FollowedNichesContext = createContext<FollowedNichesContextValue | null>(null);

export function FollowedNichesProvider({ children, knownNicheIds, syncFollow }: { children: ReactNode; knownNicheIds: string[]; syncFollow?: (id: string, followed: boolean) => Promise<unknown> }) {
  const knownIds = useMemo(() => new Set(knownNicheIds), [knownNicheIds]);
  const [followedNicheIds, setFollowedNicheIds] = useState(() =>
    DEFAULT_FOLLOWED_NICHE_IDS.filter((id) => knownIds.has(id)),
  );
  const [announcement, setAnnouncement] = useState("");
  const accountSync = useRef(syncFollow ?? null);

  useEffect(() => { accountSync.current = syncFollow ?? accountSync.current; }, [syncFollow]);

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
    void accountSync.current?.(id, added);
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ version: 1, followedNicheIds: next }));
    } catch {
      // Preferences still work for this session when storage is unavailable.
    }
    setAnnouncement(`${name} ${added ? "added to" : "removed from"} Your Larps`);
  }, [followedNicheIds]);

  const hydrateFollows = useCallback((ids: string[]) => {
    const next = [...new Set(ids.filter((id) => knownIds.has(id)))];
    setFollowedNicheIds(next);
    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ version: 1, followedNicheIds: next }));
    } catch {
      // The server remains authoritative when local storage is unavailable.
    }
  }, [knownIds]);

  const value = useMemo<FollowedNichesContextValue>(() => ({
    followedNicheIds,
    isFollowed: (id) => followedNicheIds.includes(id),
    toggleFollow,
    hydrateFollows,
    registerAccountSync: (sync) => { accountSync.current = sync; },
  }), [followedNicheIds, hydrateFollows, toggleFollow]);

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
