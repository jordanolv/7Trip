import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { InvitationsService } from './invitations.service.js';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsService } from './participants.service.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TripsController, ParticipantsController],
  providers: [TripsService, InvitationsService, ParticipantsService],
})
export class TripsModule {}
