import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { validateEditorialUpload, validateMediaRights } from "./upload";

function webp(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set([82, 73, 70, 70], 0); // RIFF
  bytes[4] = 22;
  bytes.set([87, 69, 66, 80], 8); // WEBP
  bytes.set([86, 80, 56, 88], 12); // VP8X
  bytes[16] = 10;
  bytes[24] = (width - 1) & 255;
  bytes[25] = ((width - 1) >> 8) & 255;
  bytes[26] = ((width - 1) >> 16) & 255;
  bytes[27] = (height - 1) & 255;
  bytes[28] = ((height - 1) >> 8) & 255;
  bytes[29] = ((height - 1) >> 16) & 255;
  return new File([bytes], "cover.webp", { type: "image/webp" });
}

describe("validateEditorialUpload", () => {
  it("accepts a decodable WebP with dimensions verified from its bytes", async () => {
    const bytes = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#f0f0f0" } }).webp().toBuffer();
    await expect(validateEditorialUpload(new File([new Uint8Array(bytes)], "cover.webp", { type: "image/webp" })))
      .resolves.toMatchObject({ width: 1200, height: 800 });
  });

  it("rejects forged images and oversized dimensions", async () => {
    await expect(validateEditorialUpload(new File(["<script>"], "cover.webp", { type: "image/webp" }))).rejects.toThrow("WebP");
    await expect(validateEditorialUpload(webp(1600, 800))).rejects.toThrow("1400");
    await expect(validateEditorialUpload(webp(1200, 800))).rejects.toThrow("decodable");
  });
});

describe("validateMediaRights", () => {
  const approved = {
    alt: "Crowd at a live concert", sourceUrl: "https://example.com/press/cover", creditLine: "Photo by Artist",
    licenseCode: "permission", commercialUseAllowed: true, modificationAllowed: true, socialUseAllowed: false,
  };

  it("requires an attributable source and explicit commercial permission", () => {
    expect(validateMediaRights(approved)).toEqual(approved);
    expect(() => validateMediaRights({ ...approved, sourceUrl: "javascript:alert(1)" })).toThrow("public HTTPS");
    expect(() => validateMediaRights({ ...approved, commercialUseAllowed: false })).toThrow(/commercial/i);
  });
});
