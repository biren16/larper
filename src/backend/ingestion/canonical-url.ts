const TRACKING_KEYS = new Set(["fbclid", "gclid", "igsh", "igshid", "mc_cid", "mc_eid", "si"]);

function isTrackingKey(key: string): boolean {
  return key.toLowerCase().startsWith("utm_") || TRACKING_KEYS.has(key.toLowerCase());
}

export function canonicalizeUrl(input: string): string {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Signal URL must use http or https");
  }

  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";

  if (url.hostname === "youtu.be") {
    const videoId = url.pathname.split("/").filter(Boolean)[0];
    if (!videoId) throw new Error("YouTube share URL is missing a video id");
    url.hostname = "www.youtube.com";
    url.pathname = "/watch";
    url.searchParams.set("v", videoId);
  }

  for (const key of [...url.searchParams.keys()]) {
    if (isTrackingKey(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();

  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
  if (url.pathname === "/" && !url.search) url.pathname = "";
  return url.toString();
}
