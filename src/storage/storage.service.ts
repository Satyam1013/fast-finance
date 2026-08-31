import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, normalize, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

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

/**
 * File storage for KYC documents, profile photos and CMS images. Local disk is
 * the supported driver for now (STORAGE_DRIVER=local); the S3 path is a TODO
 * kept behind the same interface so callers do not change (FRS §10.2).
 *
 * Keys are opaque and uuid-based. Files are served back through
 * {@link FilesController} which requires a valid token.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root = resolve(process.cwd(), "uploads");
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config
      .get<string>(
        "PUBLIC_ASSET_BASE_URL",
        "http://localhost:4000/api/v1/files",
      )
      .replace(/\/+$/, "");
  }

  /** Persist a buffer under `<folder>/<uuid>.<ext>` and return its key + URL. */
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
    const key = `${safeFolder}/${randomUUID()}${this.extFor(file.mimetype)}`;
    const abs = this.resolveKey(key);

    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, file.buffer);

    return {
      key,
      url: `${this.baseUrl}/${key}`,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /** Absolute public URL for a stored key (or undefined when unset). */
  urlFor(key?: string | null): string | undefined {
    return key ? `${this.baseUrl}/${key}` : undefined;
  }

  /** Open a read stream for a key — used by {@link FilesController}. */
  stream(key: string) {
    const abs = this.resolveKey(key);
    if (!existsSync(abs)) throw new NotFoundException("File not found");
    return createReadStream(abs);
  }

  private extFor(mime: string): string {
    switch (mime) {
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/heic":
        return ".heic";
      case "application/pdf":
        return ".pdf";
      default:
        return "";
    }
  }

  /** Resolve a key to an absolute path, refusing anything outside `uploads/`. */
  private resolveKey(key: string): string {
    const abs = resolve(this.root, normalize(key));
    if (abs !== this.root && !abs.startsWith(this.root + sep)) {
      throw new BadRequestException("Invalid file path");
    }
    return abs;
  }
}
