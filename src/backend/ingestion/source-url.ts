const PRIVATE_IPV4 = /^(?:127\.|10\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;

const WATCHLIST_NICHES: Record<string, string> = {
  f1: "f1",
  books: "books",
  music: "music",
  "tech-gaming": "gaming-tech",
  "internet-culture": "internet-culture",
  "screen-culture": "screen-culture",
};

export function suggestedNicheForWatchlistBeat(value: string | null | undefined): string | undefined {
  return value ? WATCHLIST_NICHES[value] : undefined;
}

export function isPublicSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host === "::1" || host === "0.0.0.0" || PRIVATE_IPV4.test(host)) return false;
    return host.includes(".");
  } catch {
    return false;
  }
}
