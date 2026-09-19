export const PREFERENCES_STORAGE_KEY = "larper:preferences:v1";
export const DEFAULT_FOLLOWED_NICHE_IDS = ["fragrance", "sneakers", "f1", "streetwear"];

export function parseStoredPreferences(raw: string | null, knownIds?: ReadonlySet<string>): string[] {
  if (!raw) return [...DEFAULT_FOLLOWED_NICHE_IDS];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("followedNicheIds" in parsed) ||
      !Array.isArray(parsed.followedNicheIds)
    ) {
      return [...DEFAULT_FOLLOWED_NICHE_IDS];
    }

    const ids = parsed.followedNicheIds.filter(
      (id): id is string => typeof id === "string" && (!knownIds || knownIds.has(id)),
    );
    return [...new Set(ids)];
  } catch {
    return [...DEFAULT_FOLLOWED_NICHE_IDS];
  }
}

export function toggleFollowedNiche(current: string[], nicheId: string): string[] {
  return current.includes(nicheId)
    ? current.filter((id) => id !== nicheId)
    : [...current, nicheId];
}
