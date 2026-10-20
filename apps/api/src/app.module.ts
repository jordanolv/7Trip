import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { EnvModule } from './config/env.module.js';
import { HealthController } from './health/health.controller.js';
import { MailModule } from './mail/mail.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [EnvModule, PrismaModule, MailModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
