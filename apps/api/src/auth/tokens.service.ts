import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiErrorCode, type AuthTokens } from '@7trip/shared';
import { SignJWT, jwtVerify } from 'jose';
import { apiError } from '../common/api-error.js';
import { ENV, type Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { randomToken, sha256 } from './crypto.js';

const ISSUER = '7trip-api';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Short-lived JWT access tokens + opaque, hashed, single-use refresh tokens.
 * Reusing an already rotated refresh token is treated as theft: every session of the user is
 * revoked. See docs/architecture.md §3.
 */
@Injectable()
export class TokensService {
  private readonly key: Uint8Array;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  async issue(userId: string): Promise<AuthTokens> {
    const refreshToken = randomToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      },
    });
    return {
      accessToken: await this.signAccessToken(userId),
      refreshToken,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  /** Exchanges a refresh token for a new pair. Returns the user id the tokens belong to. */
  async rotate(refreshToken: string): Promise<{ userId: string; tokens: AuthTokens }> {
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    const invalid = apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.InvalidRefreshToken, 'Session expirée, reconnecte-toi');

    if (!stored) throw invalid;
    if (stored.revokedAt) {
      await this.revokeAll(stored.userId);
      throw invalid;
    }
    if (stored.expiresAt <= new Date()) throw invalid;

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Lost a race with a concurrent refresh using the same token.
    if (count === 0) throw invalid;

    return { userId: stored.userId, tokens: await this.issue(stored.userId) };
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Returns the user id, or null if the token is missing, forged or expired. */
  async verifyAccessToken(token: string): Promise<string | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { issuer: ISSUER, algorithms: ['HS256'] });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private signAccessToken(userId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${this.env.ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.key);
  }
}
