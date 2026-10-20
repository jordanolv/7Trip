import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import {
  emailStatusRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
  type AuthResponse,
  type CodeSentResponse,
  type EmailStatusResponse,
  type Me,
} from '@7trip/shared';
import type { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AccessTokenGuard, CurrentUserId } from './access-token.guard.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Lets the app pick "password" or "create account" after the email step. */
  @Post('email-status')
  @HttpCode(HttpStatus.OK)
  emailStatus(
    @Body(new ZodValidationPipe(emailStatusRequestSchema)) body: z.output<typeof emailStatusRequestSchema>,
  ): Promise<EmailStatusResponse> {
    return this.auth.emailStatus(body.email);
  }

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: z.output<typeof registerRequestSchema>,
  ): Promise<AuthResponse> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginRequestSchema)) body: z.output<typeof loginRequestSchema>): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  refresh(
    @Body(new ZodValidationPipe(refreshRequestSchema)) body: z.output<typeof refreshRequestSchema>,
  ): Promise<AuthResponse> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  logout(@Body(new ZodValidationPipe(refreshRequestSchema)) body: z.output<typeof refreshRequestSchema>): Promise<void> {
    return this.auth.logout(body.refreshToken);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  verifyEmail(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(verifyEmailRequestSchema)) body: z.output<typeof verifyEmailRequestSchema>,
  ): Promise<Me> {
    return this.auth.verifyEmail(userId, body.code);
  }

  @Post('verify-email/resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  resendVerification(@CurrentUserId() userId: string): Promise<CodeSentResponse> {
    return this.auth.resendVerification(userId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordRequestSchema)) body: z.output<typeof forgotPasswordRequestSchema>,
  ): Promise<CodeSentResponse> {
    return this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordRequestSchema)) body: z.output<typeof resetPasswordRequestSchema>,
  ): Promise<AuthResponse> {
    return this.auth.resetPassword(body);
  }
}
