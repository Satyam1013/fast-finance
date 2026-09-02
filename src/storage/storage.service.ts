import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { STORAGE_DRIVER, type StorageDriver } from "./drivers/storage-driver";

export interface StoredFile {
  /** Storage key, e.g. `documents/<id>/<uuid>.jpg` — persisted on the record. */
  key: string;
  /** Absolute, ready-to-serve URL built from PUBLIC_ASSET_BASE_URL. */
  url: string;
  mimeType: string;
  size: number;
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — KYC scans / statements

const EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "application/pdf": ".pdf",
};

/**
 * File storage for KYC documents, profile photos and CMS images. The backend is
 * chosen by `STORAGE_DRIVER` (`local` | `s3`); this service owns validation,
 * key generation and URL building, and delegates the blob I/O to the driver.
 *
 * Keys are opaque and uuid-based. Objects are private — reads go back through
 * {@link FilesController} (`/files/*`), which requires a valid token.
 */
@Injectable()
export class StorageService {
  private readonly baseUrl: string;

  constructor(
    config: ConfigService,
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
  ) {
    this.baseUrl = config
      .get<string>(
        "PUBLIC_ASSET_BASE_URL",
        "http://localhost:4000/api/v1/files",
      )
      .replace(/\/+$/, "");
  }

  /** Validate, store under `<folder>/<uuid>.<ext>`, return its key + URL. */
  async save(
    folder: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<StoredFile> {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        success: false,
        code: "FILE_EMPTY",
        message: "No file was received.",
      });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        success: false,
        code: "FILE_TOO_LARGE",
        message: "File must be 10 MB or smaller.",
      });
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException({
        success: false,
        code: "FILE_TYPE_UNSUPPORTED",
        message: "Upload a JPG, PNG, WEBP or PDF file.",
      });
    }

    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
    const key = `${safeFolder}/${randomUUID()}${EXT[file.mimetype] ?? ""}`;
    await this.driver.put(key, file.buffer, file.mimetype);

    return {
      key,
      url: `${this.baseUrl}/${key}`,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /** Absolute URL for a stored key (or undefined when unset). */
  urlFor(key?: string | null): string | undefined {
    return key ? `${this.baseUrl}/${key}` : undefined;
  }

  /** Open a read stream for a key — used by {@link FilesController}. */
  stream(key: string): Promise<Readable> {
    return this.driver.get(key);
  }

  /** Permanently delete a stored object. */
  delete(key: string): Promise<void> {
    return this.driver.remove(key);
  }
}
