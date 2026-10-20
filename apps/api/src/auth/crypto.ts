import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { EMAIL_CODE_LENGTH } from '@7trip/shared';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** 256-bit random token, URL safe. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Uniformly random numeric code, e.g. "042317". */
export function randomNumericCode(length = EMAIL_CODE_LENGTH): string {
  return randomInt(0, 10 ** length).toString().padStart(length, '0');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
