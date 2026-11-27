import { Body, Controller, Get, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiErrorCode, updateMeRequestSchema, type Me } from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId } from '../auth/access-token.guard.js';
import { apiError } from '../common/api-error.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toMe } from './to-me.js';

@Controller('me')
@UseGuards(AccessTokenGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUserId() userId: string): Promise<Me> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // An access token outlives a deleted account by a few minutes: the app then signs out.
    if (!user) throw apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.Unauthorized, 'Ce compte n’existe plus');
    return toMe(user);
  }

  @Patch()
  async update(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(updateMeRequestSchema)) body: z.output<typeof updateMeRequestSchema>,
  ): Promise<Me> {
    const data = { displayName: body.displayName, avatarColor: body.avatarColor };
    // Each trip keeps a copy of the name and colour (they stay readable once the account is gone):
    // the profile updates all of them.
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data }),
      this.prisma.participant.updateMany({ where: { userId }, data }),
    ]);
    return toMe(user);
  }
}
