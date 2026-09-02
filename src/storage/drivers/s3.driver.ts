import { Logger, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";
import type { StorageDriver } from "./storage-driver";

/**
 * S3-compatible driver. Configured for **DigitalOcean Spaces** but works with
 * AWS S3 / MinIO too:
 *   S3_ENDPOINT   = https://blr1.digitaloceanspaces.com   (regional host)
 *   S3_REGION     = blr1                                   (Space's region)
 *   S3_BUCKET     = <space name>
 *   S3_ACCESS_KEY / S3_SECRET_KEY = Spaces access keys
 *
 * Objects are uploaded private; reads go through the `/files/*` proxy.
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = "s3" as const;
  private readonly logger = new Logger(S3StorageDriver.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>("S3_BUCKET");
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>("S3_ENDPOINT"),
      region: config.get<string>("S3_REGION") || "us-east-1",
      forcePathStyle: false,
      credentials: {
        accessKeyId: config.getOrThrow<string>("S3_ACCESS_KEY"),
        secretAccessKey: config.getOrThrow<string>("S3_SECRET_KEY"),
      },
    });
    this.logger.log(`S3 storage → ${this.bucket}`);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "private",
      }),
    );
  }

  async get(key: string): Promise<Readable> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!res.Body) throw new NotFoundException("File not found");
      return res.Body as Readable;
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === "NoSuchKey" || name === "NotFound") {
        throw new NotFoundException("File not found");
      }
      throw err;
    }
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
