import { canonicalizeUrl } from "./canonical-url";
import { isPublicSourceUrl } from "./source-url";

export function validateCreatorProfile(value: string): { profileUrl: string; domain: string } {
  if (!isPublicSourceUrl(value)) throw new Error("Enter a public creator profile URL");
  const url = new URL(canonicalizeUrl(value));
  url.hostname = url.hostname.replace(/^www\./, "");
  if (url.hostname === "twitter.com") url.hostname = "x.com";
  const host = url.hostname;
  const path = url.pathname;
  const allowed = host === "instagram.com" ? /^\/[a-z0-9._]+$/i.test(path) && !/^\/(reel|p|tv|stories|explore|accounts)$/i.test(path)
    : host === "tiktok.com" ? /^\/@[a-z0-9._]+$/i.test(path)
    : host === "x.com" ? /^\/[a-z0-9_]+$/i.test(path) && !/^\/(i|home|explore|search)$/i.test(path)
    : host === "youtube.com" ? /^\/(?:@[a-z0-9._-]+|channel\/UC[a-z0-9_-]+)$/i.test(path)
    : host === "reddit.com" ? /^\/(?:user|u)\/[a-z0-9_-]+$/i.test(path)
    : path === "/";
  if (!allowed || url.search) throw new Error("Use the creator profile URL, not a post or video URL");
  if (host !== "youtube.com" || !path.startsWith("/channel/")) url.pathname = path.toLowerCase();
  if (host === "reddit.com") url.pathname = url.pathname.replace(/^\/u\//, "/user/");
  return { profileUrl: url.toString().replace(/\/$/, ""), domain: host };
}


export function isSocialCreatorDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return ["instagram.com", "tiktok.com", "x.com", "twitter.com", "youtube.com", "youtu.be", "reddit.com"].some((domain) => host === domain || host.endsWith(`.${domain}`));
}
