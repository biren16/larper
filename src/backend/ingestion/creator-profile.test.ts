import { expect, it } from "vitest";
import { validateCreatorProfile } from "./creator-profile";

it("canonicalizes reusable profiles rather than individual post identities", () => {
  expect(validateCreatorProfile("https://www.instagram.com/Artist/?utm_source=link")).toEqual({ profileUrl: "https://instagram.com/artist", domain: "instagram.com" });
  expect(validateCreatorProfile("https://twitter.com/Artist")).toEqual({ profileUrl: "https://x.com/artist", domain: "x.com" });
  expect(validateCreatorProfile("https://www.youtube.com/@artist")).toEqual({ profileUrl: "https://youtube.com/@artist", domain: "youtube.com" });
});

it("refuses a post or private address as the creator profile", () => {
  for (const url of ["https://instagram.com/reel/abc", "https://x.com/artist/status/123", "https://youtube.com/watch?v=123", "http://127.0.0.1/profile"]) expect(() => validateCreatorProfile(url)).toThrow("profile");
});
