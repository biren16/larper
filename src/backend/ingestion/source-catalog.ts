import presets from "./culture-source-presets.json";
import { isPublicSourceUrl } from "./source-url";
import { hasUsageReview } from "./source-review";
export { hasUsageReview };

export const CULTURE_BEATS = [
  { id: "music", label: "Music", description: "Regional rap, underground scenes, artist lore and fandom rituals." },
  { id: "screen-culture", label: "Screen Culture", description: "Cult films, anime, regional cinema and adaptation debates." },
  { id: "style", label: "Style", description: "Sneakers, streetwear, thrifting, Indian labels and archive fashion." },
  { id: "tech-gaming", label: "Gaming & Tech", description: "Cozy games, indie discoveries, modding and handheld communities." },
  { id: "internet-culture", label: "Internet Culture", description: "Meme origins, fandom lore, slang and platform rituals." },
  { id: "books", label: "Books", description: "Romantasy, horror microgenres, fan theories and adaptations." },
  { id: "f1", label: "F1", description: "Team identity, paddock culture, race radio and rule explainers." },
] as const;
export const CULTURE_SOURCE_PRESETS = presets;

export function sourceOriginKey(source: { id: string; config?: unknown }): string {
  const config = source.config && typeof source.config === "object" ? source.config as Record<string, unknown> : {};
  if (typeof config.originKey === "string" && config.originKey.trim()) return config.originKey.trim();
  try {
    const host = new URL(String(config.url ?? config.publisherUrl ?? "")).hostname.toLowerCase().replace(/^www\./, "");
    if (host) return `publisher:${host}`;
  } catch { /* Legacy definitions without an origin retain their identity. */ }
  if (typeof config.channelId === "string" && config.channelId.trim()) return `creator:https://youtube.com/channel/${config.channelId.trim()}`;
  return `source:${source.id}`;
}

export function validateUsageReview(input: { termsUrl: string; basis: string; notes: string }, reviewerId: string, now: string) {
  if (!isPublicSourceUrl(input.termsUrl)) throw new Error("A public terms or permission URL is required");
  if (!input.basis.trim()) throw new Error("A usage permission basis is required");
  if (!input.notes.trim()) throw new Error("Record the permitted usage and restrictions");
  if (!reviewerId || !Number.isFinite(Date.parse(now))) throw new Error("A valid reviewer and review date are required");
  return { termsUrl: new URL(input.termsUrl).toString(), basis: input.basis.trim(), notes: input.notes.trim(), reviewedBy: reviewerId, reviewedAt: now };
}
