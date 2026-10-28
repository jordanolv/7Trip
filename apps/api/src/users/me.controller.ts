import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { updateMeRequestSchema, type Me } from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId } from '../auth/access-token.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toMe } from './to-me.js';

@Controller('me')
@UseGuards(AccessTokenGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUserId() userId: string): Promise<Me> {
    return toMe(await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }));
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
