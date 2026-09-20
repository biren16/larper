import type { SourceType } from "@/domain/discovery/types";
import { canonicalizeUrl } from "./canonical-url";
import type { NormalizedSignal } from "./types";

export interface ManualSignalInput {
  url: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  region: string;
  locale?: string;
  author?: string;
  body?: string;
}

function sourceType(url: URL): SourceType {
  if (url.hostname.endsWith("instagram.com")) return "instagram";
  if (url.hostname.endsWith("tiktok.com")) return "tiktok";
  if (url.hostname.endsWith("reddit.com")) return "reddit";
  if (url.hostname.endsWith("youtube.com") || url.hostname === "youtu.be") return "youtube";
  return "manual";
}

export function normalizeManualSignal(input: ManualSignalInput, sourceDefinitionId: string, observedAt: string): NormalizedSignal {
  const title = input.title.trim();
  const name = input.sourceName.trim();
  if (!title || !name) throw new Error("Manual signals require a title and source name");
  const canonicalUrl = canonicalizeUrl(input.url);
  const publishedAt = Date.parse(input.publishedAt);
  if (!Number.isFinite(publishedAt)) throw new Error("Manual signals require a valid publication date");

  return {
    sourceDefinitionId,
    canonicalUrl,
    sourceType: sourceType(new URL(canonicalUrl)),
    sourceName: name,
    author: input.author?.trim() || undefined,
    title,
    body: input.body?.trim() || undefined,
    locale: input.locale?.trim() || "en-IN",
    region: input.region.trim() || "global",
    publishedAt: new Date(publishedAt).toISOString(),
    observedAt,
    trustTier: "watchlist",
    availability: "available",
    metrics: {},
    sensitiveFlags: [],
  };
}
