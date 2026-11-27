import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PlacesModule } from '../places/places.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { IdeasController } from './ideas.controller.js';
import { IdeasService } from './ideas.service.js';

@Module({
  imports: [AuthModule, TripsModule, PlacesModule],
  controllers: [IdeasController],
  providers: [IdeasService],
})
export class IdeasModule {}
