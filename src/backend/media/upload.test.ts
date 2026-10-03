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
  it("decodes PNG and converts with permission to a bounded WebP", async () => {
    const bytes = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "red" } }).png().toBuffer();
    const result = await validateEditorialUpload(new File([bytes], "cover.png", { type: "image/png" }), true);
    expect(result.width).toBe(1400);
    expect(result.bytes.length).toBeLessThanOrEqual(400_000);
    expect((await sharp(result.bytes).metadata()).format).toBe("webp");
  });
  it("requires modification permission for resizing and lossy conversion", async () => {
    const bytes = await sharp({ create: { width: 1500, height: 1000, channels: 3, background: "red" } }).jpeg().toBuffer();
    await expect(validateEditorialUpload(new File([bytes], "cover.jpg", { type: "image/jpeg" }), false)).rejects.toThrow(/permission/i);
  });
  it("rejects a misleading MIME and excessive decoded pixels", async () => {
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: "red" } }).png().toBuffer();
    await expect(validateEditorialUpload(new File([bytes], "cover.webp", { type: "image/webp" }), true)).rejects.toThrow(/match/i);
    const big = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "red" } }).png().toBuffer();
    await expect(validateEditorialUpload(new File([big], "cover.png", { type: "image/png" }), true)).rejects.toThrow(/pixels/i);
  });
  it("accepts a decodable WebP with dimensions verified from its bytes", async () => {
    const bytes = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#f0f0f0" } }).webp().toBuffer();
    await expect(validateEditorialUpload(new File([new Uint8Array(bytes)], "cover.webp", { type: "image/webp" })))
      .resolves.toMatchObject({ width: 1200, height: 800 });
  });

  it("rejects forged images and oversized dimensions", async () => {
    await expect(validateEditorialUpload(new File(["<script>"], "cover.webp", { type: "image/webp" }))).rejects.toThrow("WebP");
    await expect(validateEditorialUpload(webp(1600, 800))).rejects.toThrow("decodable");
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
it('rejects decoded animation and leaves compliant unmodifiable WebP bytes unchanged',async()=>{
 const frames=Buffer.concat([Buffer.alloc(12),Buffer.alloc(12,255)]);
 const animated=await sharp(frames,{raw:{width:2,height:4,channels:3,pageHeight:2}}).webp({loop:0,delay:[100,100]}).toBuffer();
 await expect(validateEditorialUpload(new File([animated],'animation.webp',{type:'image/webp'}),true)).rejects.toThrow(/animated/i);
 const still=await sharp({create:{width:32,height:32,channels:3,background:'red'}}).webp().toBuffer();
 const result=await validateEditorialUpload(new File([still],'cover.webp',{type:'image/webp'}),false);
 expect(Buffer.from(result.bytes)).toEqual(still);
});
it('accepts the exact 10 MB file boundary and rejects the next byte before decoding',async()=>{
 const png=await sharp({create:{width:32,height:32,channels:3,background:'red'}}).png().toBuffer();
 const max=Buffer.alloc(10_000_000);png.copy(max);
 await expect(validateEditorialUpload(new File([max],'boundary.png',{type:'image/png'}),false)).resolves.toMatchObject({width:32,height:32});
 await expect(validateEditorialUpload(new File([Buffer.alloc(10_000_001)],'too-large.png',{type:'image/png'}),true)).rejects.toThrow(/10 MB/);
});
