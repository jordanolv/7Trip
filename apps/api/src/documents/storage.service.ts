import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ENV, type Env } from '../config/env.js';

/** docs/decisions.md: a link to a file stops working in under 5 minutes. */
export const SIGNED_URL_SECONDS = 4 * 60;

const KEY_PATTERN = /^trips\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/;

/**
 * Where the documents' files live, never public: they are opened through links signed for a few
 * minutes, handed out after the API has checked who may see them.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.s3 =
      env.STORAGE_DRIVER === 's3'
        ? new S3Client({
            endpoint: env.S3_ENDPOINT,
            region: env.S3_REGION,
            forcePathStyle: env.S3_FORCE_PATH_STYLE,
            credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
          })
        : null;
  }

  static key(tripId: string, documentId: string): string {
    return `trips/${tripId}/${documentId}`;
  }

  async put(key: string, body: Buffer, mime: string): Promise<void> {
    if (this.s3) {
      await this.s3.send(new PutObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key, Body: body, ContentType: mime }));
      return;
    }
    const path = this.localPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  /** After the rows are gone. A file left behind only costs space: it is logged, not thrown. */
  async remove(keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      if (this.s3) {
        for (let i = 0; i < keys.length; i += 1000) {
          const chunk = keys.slice(i, i + 1000).map((Key) => ({ Key }));
          await this.s3.send(new DeleteObjectsCommand({ Bucket: this.env.S3_BUCKET, Delete: { Objects: chunk, Quiet: true } }));
        }
      } else {
        await Promise.all(keys.map((key) => rm(this.localPath(key), { force: true })));
      }
    } catch (error) {
      this.logger.error(`Could not delete ${keys.length} file(s): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * A link to open the file for a few minutes. `apiBase`: this API's public address, for the
   * local driver, which serves the files itself (GET /v1/files).
   */
  async signedUrl(key: string, file: { mime: string; fileName: string }, apiBase: string): Promise<{ url: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + SIGNED_URL_SECONDS * 1000);
    if (this.s3) {
      const command = new GetObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
        ResponseContentType: file.mime,
        ResponseContentDisposition: contentDisposition(file.fileName),
      });
      return { url: await getSignedUrl(this.s3, command, { expiresIn: SIGNED_URL_SECONDS }), expiresAt };
    }
    const expires = Math.floor(expiresAt.getTime() / 1000);
    const query = new URLSearchParams({ key, expires: String(expires), signature: this.sign(key, expires) });
    return { url: `${apiBase}/v1/files?${query.toString()}`, expiresAt };
  }

  /** Local driver: the file behind a signed link still valid, else null. */
  verifiedLocalPath(key: string, expires: number, signature: string): string | null {
    if (this.s3 || !KEY_PATTERN.test(key) || !Number.isInteger(expires) || expires * 1000 < Date.now()) return null;
    const expected = Buffer.from(this.sign(key, expires));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    return this.localPath(key);
  }

  private sign(key: string, expires: number): string {
    return createHmac('sha256', this.env.JWT_SECRET).update(`file:${key}:${expires}`).digest('base64url');
  }

  private localPath(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new Error('Invalid storage key');
    return resolve(this.env.STORAGE_DIR, key);
  }
}

/** Shown in the browser, under its own name (accents kept through RFC 5987). */
export function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
