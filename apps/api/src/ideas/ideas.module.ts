import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { IdeasController } from './ideas.controller.js';
import { IdeasService } from './ideas.service.js';

@Module({
  imports: [AuthModule, TripsModule],
  controllers: [IdeasController],
  providers: [IdeasService],
})
export class IdeasModule {}
