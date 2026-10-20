import { CanActivate, ExecutionContext, HttpStatus, Injectable, createParamDecorator } from '@nestjs/common';
import { ApiErrorCode } from '@7trip/shared';
import type { Request } from 'express';
import { apiError } from '../common/api-error.js';
import { TokensService } from './tokens.service.js';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

/** Requires a valid `Authorization: Bearer <access token>` header. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    const userId = scheme === 'Bearer' && token ? await this.tokens.verifyAccessToken(token) : null;
    if (!userId) {
      throw apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.Unauthorized, 'Connexion requise');
    }
    request.userId = userId;
    return true;
  }
}

/** Id of the user authenticated by AccessTokenGuard. */
export const CurrentUserId = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  const userId = context.switchToHttp().getRequest<AuthenticatedRequest>().userId;
  if (!userId) throw new Error('CurrentUserId used on a route without AccessTokenGuard');
  return userId;
});
