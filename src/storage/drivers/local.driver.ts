import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, normalize, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import type { StorageDriver } from "./storage-driver";

/** Local-disk driver — files under `./uploads`. Ephemeral on most PaaS hosts. */
export class LocalStorageDriver implements StorageDriver {
  readonly name = "local" as const;
  private readonly root = resolve(process.cwd(), "uploads");

  async put(key: string, body: Buffer): Promise<void> {
    const abs = this.resolveKey(key);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, body);
  }

  get(key: string): Promise<Readable> {
    const abs = this.resolveKey(key);
    if (!existsSync(abs)) throw new NotFoundException("File not found");
    return Promise.resolve(createReadStream(abs));
  }

  async remove(key: string): Promise<void> {
    const abs = this.resolveKey(key);
    if (existsSync(abs)) await unlink(abs);
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
