import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ENV, type Env } from '../config/env.js';
import { MeController } from '../users/me.controller.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailCodesService } from './email-codes.service.js';
import { PasswordService } from './password.service.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        throttlers: [{ ttl: 60_000, limit: env.AUTH_RATE_LIMIT_PER_MINUTE }],
        errorMessage: 'Trop de tentatives, réessaie dans une minute',
        skipIf: () => env.NODE_ENV === 'test',
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, TokensService, EmailCodesService, PasswordService, AccessTokenGuard],
  exports: [TokensService, AccessTokenGuard],
})
export class AuthModule {}
