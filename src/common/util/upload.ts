import { memoryStorage } from "multer";
import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

/**
 * Shared config for multipart uploads — keep files in memory so
 * {@link StorageService} decides where they land (local disk / S3), and cap
 * the size before the buffer is fully read.
 */
export const uploadOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
};

/** The slice of `Express.Multer.File` that {@link StorageService} needs. */
export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

/** Pull the single file for a field out of a FileFieldsInterceptor result. */
export function pickFile(
  files: Record<string, Express.Multer.File[]> | undefined,
  field: string,
): UploadedFile | undefined {
  const f = files?.[field]?.[0];
  return f
    ? {
        buffer: f.buffer,
        mimetype: f.mimetype,
        size: f.size,
        originalname: f.originalname,
      }
    : undefined;
}
