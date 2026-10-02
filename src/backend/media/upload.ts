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

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

export async function validateEditorialUpload(file: File): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  if (file.type !== "image/webp" || file.size > 400_000 || file.size < 30) {
    throw new Error("Upload a WebP image under 400 KB");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") throw new Error("Invalid WebP image");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) + 8 !== bytes.length) throw new Error("Invalid WebP image size");
  const format = ascii(bytes, 12, 4);
  let width: number;
  let height: number;
  if (format === "VP8X" && bytes.length >= 30) {
    width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
  } else if (format === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    width = view.getUint16(26, true) & 0x3fff;
    height = view.getUint16(28, true) & 0x3fff;
  } else if (format === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
    height = 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10);
  } else {
    throw new Error("Unsupported WebP image");
  }
  if (width < 1 || height < 1 || width > 1400 || height > 1400) throw new Error("Image dimensions must be at most 1400 × 1400");
  try {
    const { info } = await sharp(bytes, { limitInputPixels: 1400 * 1400 }).raw().toBuffer({ resolveWithObject: true });
    if (info.width !== width || info.height !== height) throw new Error("Dimensions do not match decoded image");
  } catch {
    throw new Error("Image must be a decodable WebP");
  }
  return { bytes, width, height };
}
