import { Body, Controller, Delete, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { deleteAccountRequestSchema } from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId } from '../auth/access-token.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AccountService } from './account.service.js';

@Controller('me')
@UseGuards(AccessTokenGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /** Everything the account wrote or that concerns it, as JSON (RGPD). */
  @Get('export')
  export(@CurrentUserId() userId: string) {
    return this.account.export(userId);
  }

  /** Throttled like the sign-in: it checks the password. */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  delete(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(deleteAccountRequestSchema)) body: z.output<typeof deleteAccountRequestSchema>,
  ): Promise<void> {
    return this.account.delete(userId, body.password);
  }
}
