import type { UploadedFile } from "./upload";

const DATA_URI = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

/**
 * Decode a `data:<mime>;base64,<data>` string into the same shape
 * {@link StorageService.save} accepts from a multipart upload. Several admin
 * panel screens send images this way instead of multipart/form-data — accept
 * either rather than forcing one client shape (mirrors how `image`/`imageRef`
 * are both accepted on banners/products).
 *
 * Returns `null` for anything that isn't a data URI (including an already-
 * resolved URL or storage key) so callers can fall through to that case.
 */
export function parseBase64Upload(value: unknown): UploadedFile | null {
  if (typeof value !== "string") return null;
  const match = DATA_URI.exec(value.trim());
  if (!match) return null;
  const [, mimetype, data] = match;
  const buffer = Buffer.from(data, "base64");
  return { buffer, mimetype, size: buffer.length, originalname: "upload" };
}
