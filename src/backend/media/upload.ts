import sharp from "sharp";

export interface MediaRights {
  alt: string;
  sourceUrl: string;
  creditLine: string;
  licenseCode: string;
  commercialUseAllowed: boolean;
  modificationAllowed: boolean;
  socialUseAllowed: boolean;
}

export function validateMediaRights(rights: MediaRights): MediaRights {
  const alt = rights.alt.trim();
  const creditLine = rights.creditLine.trim();
  const licenseCode = rights.licenseCode.trim();
  if (!alt || !creditLine || !licenseCode) throw new Error("Alt text, credit and licence are required");
  let source: URL;
  try { source = new URL(rights.sourceUrl); } catch { throw new Error("A public HTTPS source URL is required"); }
  if (source.protocol !== "https:") throw new Error("A public HTTPS source URL is required");
  if (!rights.commercialUseAllowed) throw new Error("Commercial-use permission is required for uploaded media");
  return { ...rights, alt, sourceUrl: source.toString(), creditLine, licenseCode };
}

// Decode before trusting dimensions or MIME. Bound allocation even for compressed bombs.
export const MAX_EDITORIAL_PIXELS = 20_000_000;
export async function validateEditorialUpload(file: File, modificationAllowed = false): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (!formats[file.type] || file.size > 10_000_000 || file.size < 30) throw new Error("Upload a JPEG, PNG or WebP image up to 10 MB");
  const input = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/png") {
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    for (let offset = 8; offset + 12 <= input.length;) {
      const length = view.getUint32(offset);
      const type = String.fromCharCode(...input.subarray(offset + 4, offset + 8));
      if (type === "acTL") throw new Error("Animated images are not supported; upload a still image");
      offset += length + 12;
    }
  }
  const image = sharp(input, { limitInputPixels: MAX_EDITORIAL_PIXELS, animated: true });
  let metadata;
  try { metadata = await image.metadata(); }
  catch { throw new Error("Image must be decodable; maximum 20 million pixels"); }
  if (metadata.format !== formats[file.type]) throw new Error("Image contents must match its JPEG, PNG or WebP file type");
  if ((metadata.pages ?? 1) > 1) throw new Error("Animated images are not supported; upload a still image");
  const { width, height } = metadata;
  if (!width || !height || width * height > MAX_EDITORIAL_PIXELS) throw new Error("Image exceeds the maximum 20 million pixels");
  // Keep compliant WebP byte-for-byte, including where editing permission is absent.
  if (metadata.format === "webp" && width <= 1400 && height <= 1400 && input.length <= 400_000) {
    try { await image.raw().toBuffer(); } catch { throw new Error("Image must be a decodable WebP"); }
    return { bytes: input, width, height };
  }
  if (!modificationAllowed && (width > 1400 || height > 1400)) throw new Error("Resizing to 1400 × 1400 needs modification permission. Upload a smaller approved image or use a LARPer cover.");
  if (!modificationAllowed) {
    const lossless = await image.webp({ lossless: true }).toBuffer({ resolveWithObject: true });
    if (lossless.data.length > 400_000) throw new Error("Meeting the 400 KB limit needs lossy conversion and modification permission. Upload a smaller approved image or use a LARPer cover.");
    return { bytes: new Uint8Array(lossless.data), width: lossless.info.width, height: lossless.info.height };
  }
  for (const quality of [85, 70, 55, 40]) {
    const converted = await sharp(input, { limitInputPixels: MAX_EDITORIAL_PIXELS }).resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
    if (converted.data.length <= 400_000) return { bytes: new Uint8Array(converted.data), width: converted.info.width, height: converted.info.height };
  }
  throw new Error("Image cannot meet the 400 KB limit. Choose a simpler or smaller image, or use a LARPer cover.");
}
