import { Injectable } from '@nestjs/common';
import { EmailCodePurpose } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomNumericCode, safeEqual, sha256 } from './crypto.js';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(userId: string, purpose: EmailCodePurpose, code: string): string {
  return sha256(`${userId}:${purpose}:${code}`);
}

/** One-time six-digit codes (email verification, password reset). Only the latest one is valid. */
@Injectable()
export class EmailCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string, purpose: EmailCodePurpose): Promise<string> {
    const code = randomNumericCode();
    await this.prisma.$transaction([
      this.prisma.emailCode.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.emailCode.create({
        data: {
          userId,
          purpose,
          codeHash: hashCode(userId, purpose, code),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      }),
    ]);
    return code;
  }

  /** Consumes the code if it matches. Wrong guesses count towards a small attempt limit. */
  async consume(userId: string, purpose: EmailCodePurpose, code: string): Promise<boolean> {
    const current = await this.prisma.emailCode.findFirst({
      where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!current || current.attempts >= MAX_ATTEMPTS) return false;

    if (!safeEqual(current.codeHash, hashCode(userId, purpose, code))) {
      await this.prisma.emailCode.update({ where: { id: current.id }, data: { attempts: { increment: 1 } } });
      return false;
    }

    const { count } = await this.prisma.emailCode.updateMany({
      where: { id: current.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return count === 1;
  }
}
