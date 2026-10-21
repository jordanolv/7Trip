import { CanActivate, ExecutionContext, HttpStatus, Injectable, createParamDecorator } from '@nestjs/common';
import { ApiErrorCode, GUEST_TOKEN_HEADER } from '@7trip/shared';
import type { Request } from 'express';
import { sha256 } from '../auth/crypto.js';
import { TokensService } from '../auth/tokens.service.js';
import { apiError } from '../common/api-error.js';
import { ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from './actor.js';

interface ActorRequest extends Request {
  actor?: Actor;
}

/**
 * Trip routes open to guests: accepts a user access token, or a guest session token in the
 * `x-7trip-guest` header. Whether the caller belongs to *this* trip is checked by the services.
 */
@Injectable()
export class TripMemberGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ActorRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    const userId = scheme === 'Bearer' && token ? await this.tokens.verifyAccessToken(token) : null;
    if (userId) {
      request.actor = { kind: 'user', userId };
      return true;
    }

    const guestToken = request.headers[GUEST_TOKEN_HEADER];
    if (typeof guestToken === 'string' && guestToken) {
      const participant = await this.prisma.participant.findUnique({
        where: { guestTokenHash: sha256(guestToken) },
        select: { id: true, status: true },
      });
      if (participant?.status === ParticipantStatus.ACTIVE) {
        request.actor = { kind: 'guest', participantId: participant.id };
        return true;
      }
    }
    throw apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.Unauthorized, 'Connexion requise');
  }
}

/** The caller resolved by TripMemberGuard. */
export const CurrentActor = createParamDecorator((_: unknown, context: ExecutionContext): Actor => {
  const actor = context.switchToHttp().getRequest<ActorRequest>().actor;
  if (!actor) throw new Error('CurrentActor used on a route without TripMemberGuard');
  return actor;
});
