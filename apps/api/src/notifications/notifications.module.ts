import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsWorker } from './notifications.worker.js';
import { PushService } from './push.service.js';

/** Global: every domain writes its notifications to the outbox in its own transactions. */
@Global()
@Module({
  imports: [AuthModule, TripsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsWorker, PushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
