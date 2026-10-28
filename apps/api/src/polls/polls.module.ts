import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { PollLinksController, PollsController } from './polls.controller.js';
import { PollsService } from './polls.service.js';

@Module({
  imports: [AuthModule, TripsModule],
  controllers: [PollsController, PollLinksController],
  providers: [PollsService],
})
export class PollsModule {}
