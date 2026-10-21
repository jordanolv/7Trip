import { Inject, Injectable } from '@nestjs/common';
import { ENV, type Env } from '../config/env.js';
import { EmailCodePurpose } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hmacSha256, randomNumericCode, safeEqual } from './crypto.js';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** One-time six-digit codes (email verification, password reset). Only the latest one is valid. */
@Injectable()
export class EmailCodesService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  /** Keyed with a server secret: a six-digit code is brute-forced in no time from a plain hash. */
  private hashCode(userId: string, purpose: EmailCodePurpose, code: string): string {
    return hmacSha256(this.env.JWT_SECRET, `email-code:${userId}:${purpose}:${code}`);
  }

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
          codeHash: this.hashCode(userId, purpose, code),
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

    if (!safeEqual(current.codeHash, this.hashCode(userId, purpose, code))) {
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
