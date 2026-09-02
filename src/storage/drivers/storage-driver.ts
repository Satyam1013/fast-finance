import type { Readable } from "node:stream";

/** Injection token for the active {@link StorageDriver}. */
export const STORAGE_DRIVER = Symbol("STORAGE_DRIVER");

/**
 * Blob backend behind {@link StorageService}. `local` writes to `./uploads`;
 * `s3` targets any S3-compatible store (DigitalOcean Spaces, AWS S3, MinIO).
 * Objects are private — reads go through the auth-gated `/files/*` proxy.
 */
export interface StorageDriver {
  /** The driver name, for logs / diagnostics. */
  readonly name: "local" | "s3";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
  remove(key: string): Promise<void>;
}
