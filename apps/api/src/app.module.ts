import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { EnvModule } from './config/env.module.js';
import { HealthController } from './health/health.controller.js';
import { EventsModule } from './events/events.module.js';
import { IdeasModule } from './ideas/ideas.module.js';
import { MailModule } from './mail/mail.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { PollsModule } from './polls/polls.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TripsModule } from './trips/trips.module.js';

@Module({
  imports: [EnvModule, PrismaModule, MailModule, AuthModule, TripsModule, IdeasModule, EventsModule, PollsModule, ExpensesModule, DocumentsModule],
  controllers: [HealthController],
})
export class AppModule {}
