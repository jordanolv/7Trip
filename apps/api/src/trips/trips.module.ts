import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../documents/storage.module.js';
import { GuestSessionsService } from './guest-sessions.service.js';
import { InvitationsService } from './invitations.service.js';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsService } from './participants.service.js';
import { TripsController } from './trips.controller.js';
import { TripMemberGuard } from './trip-member.guard.js';
import { TripsService } from './trips.service.js';

@Module({
  imports: [AuthModule, StorageModule],
  controllers: [TripsController, ParticipantsController],
  providers: [TripsService, InvitationsService, ParticipantsService, GuestSessionsService, TripMemberGuard],
  exports: [TripsService, TripMemberGuard],
})
export class TripsModule {}
