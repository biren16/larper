import type { SourceType } from "@/domain/discovery/types";
import { canonicalizeUrl } from "./canonical-url";
import { isSocialCreatorDomain } from "./creator-profile";
import { isPublicSourceUrl } from "./source-url";
import type { NormalizedSignal, SourceDefinition } from "./types";

export interface ManualSignalInput {
  platform?: ManualPlatform;
  creatorOwnershipConfirmed?: boolean;
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
    if (typeof value !== "string" || !value.trim()) return [];
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? [[key, parsed]] : [];
  }));
}

export function normalizeManualSignal(input: ManualSignalInput, source: string | SourceDefinition, observedAt: string): NormalizedSignal {
  const title = input.title.trim();
  const registered = typeof source === "string" ? undefined : source;
  const name = registered?.name ?? input.sourceName.trim();
  if (!title || !name) throw new Error("Manual signals require a title and source name");
  if (!isPublicSourceUrl(input.url)) throw new Error("A public publisher or creator URL is required");
  const inputUrl = new URL(input.url);
  if (inputUrl.hostname === "twitter.com" || inputUrl.hostname === "www.twitter.com") inputUrl.hostname = "x.com";
  const canonicalUrl = canonicalizeUrl(inputUrl.toString());
  const url = new URL(canonicalUrl);
  if (registered) {
    const domains = registered.config?.domains;
    const host = url.hostname.toLowerCase();
    if (!Array.isArray(domains) || !domains.some((domain) => typeof domain === "string" && (host === domain || host.endsWith(`.${domain}`)))) {
      throw new Error("URL does not belong to the selected publisher or creator; select its registered source");
    }
    const profile = registered.config?.creatorProfileUrl;
    if (isSocialCreatorDomain(host) && typeof profile !== "string") throw new Error("Register a creator profile before manual social capture");
    if (typeof profile === "string") {
      if (!input.creatorOwnershipConfirmed) throw new Error("Confirm this post belongs to the selected creator profile");
      const creator = new URL(profile);
      const path = url.pathname.toLowerCase();
      const ownerPath = creator.pathname.toLowerCase();
      // Reels and video IDs lack owner attribution; the founder must inspect them.
      if ((host.endsWith("tiktok.com") || host.endsWith("x.com") || host.endsWith("twitter.com")) && !path.startsWith(`${ownerPath}/`)) {
        throw new Error("URL does not belong to the selected creator profile");
      }
    }
  }
  const platform = input.platform ?? (url.hostname.endsWith("instagram.com") ? "instagram" : url.hostname.endsWith("tiktok.com") ? "tiktok" : url.hostname.endsWith("reddit.com") ? "reddit" : (url.hostname.endsWith("youtube.com") || url.hostname === "youtu.be") ? "youtube" : "web");
  const publishedAt = Date.parse(input.publishedAt);
  if (!Number.isFinite(publishedAt)) throw new Error("Manual signals require a valid publication date");

  return {
    sourceDefinitionId: registered?.id ?? source as string,
    canonicalUrl,
    sourceType: sourceType(platform, url),
    sourceName: name,
    author: input.author?.trim() || undefined,
    title,
    body: input.observationNote?.trim() || input.body?.trim() || undefined,
    locale: registered?.locale ?? (input.locale?.trim() || "en-IN"),
    region: input.region.trim() || "global",
    publishedAt: new Date(publishedAt).toISOString(),
    observedAt,
    trustTier: registered?.config?.creatorProfileUrl ? "watchlist" : registered?.trustTier ?? "watchlist",
    availability: "available",
    suggestedNicheId: input.suggestedNicheId?.trim() || undefined,
    metrics: metrics(input.visibleMetrics),
    sensitiveFlags: [],
  };
}
