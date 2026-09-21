import type { SourceType } from "@/domain/discovery/types";
import { canonicalizeUrl } from "./canonical-url";
import type { NormalizedSignal } from "./types";

export interface ManualSignalInput {
  platform?: ManualPlatform;
  url: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  region: string;
  locale?: string;
  author?: string;
  body?: string;
  suggestedNicheId?: string;
  visibleMetrics?: Partial<Record<"views" | "likes" | "comments" | "shares", string>>;
  observationNote?: string;
}

export type ManualPlatform = "instagram" | "tiktok" | "reddit" | "x" | "youtube" | "web";

function sourceType(platform: ManualPlatform, url: URL): SourceType {
  const host = url.hostname.toLowerCase();
  const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  const valid = platform === "web"
    || (platform === "instagram" && matches("instagram.com"))
    || (platform === "tiktok" && matches("tiktok.com"))
    || (platform === "reddit" && matches("reddit.com"))
    || (platform === "x" && (matches("x.com") || matches("twitter.com")))
    || (platform === "youtube" && (matches("youtube.com") || host === "youtu.be"));
  if (!valid) throw new Error("Selected platform does not match the public URL");
  return platform === "x" || platform === "web" ? "manual" : platform;
}

function metrics(input: ManualSignalInput["visibleMetrics"]): Record<string, number> {
  return Object.fromEntries(Object.entries(input ?? {}).flatMap(([key, value]) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? [[key, parsed]] : [];
  }));
}

export function normalizeManualSignal(input: ManualSignalInput, sourceDefinitionId: string, observedAt: string): NormalizedSignal {
  const title = input.title.trim();
  const name = input.sourceName.trim();
  if (!title || !name) throw new Error("Manual signals require a title and source name");
  const canonicalUrl = canonicalizeUrl(input.url);
  const url = new URL(canonicalUrl);
  const platform = input.platform ?? (url.hostname.endsWith("instagram.com") ? "instagram" : url.hostname.endsWith("tiktok.com") ? "tiktok" : url.hostname.endsWith("reddit.com") ? "reddit" : (url.hostname.endsWith("youtube.com") || url.hostname === "youtu.be") ? "youtube" : "web");
  const publishedAt = Date.parse(input.publishedAt);
  if (!Number.isFinite(publishedAt)) throw new Error("Manual signals require a valid publication date");

  return {
    sourceDefinitionId,
    canonicalUrl,
    sourceType: sourceType(platform, url),
    sourceName: name,
    author: input.author?.trim() || undefined,
    title,
    body: input.observationNote?.trim() || input.body?.trim() || undefined,
    locale: input.locale?.trim() || "en-IN",
    region: input.region.trim() || "global",
    publishedAt: new Date(publishedAt).toISOString(),
    observedAt,
    trustTier: "watchlist",
    availability: "available",
    suggestedNicheId: input.suggestedNicheId?.trim() || undefined,
    metrics: metrics(input.visibleMetrics),
    sensitiveFlags: [],
  };
}
