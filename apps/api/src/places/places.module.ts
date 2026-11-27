import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { PlacesController } from './places.controller.js';
import { PlacesRefresher } from './places.refresher.js';
import { PlacesService } from './places.service.js';

@Module({
  imports: [AuthModule, TripsModule],
  controllers: [PlacesController],
  providers: [PlacesService, PlacesRefresher],
  exports: [PlacesService, PlacesRefresher],
})
export class PlacesModule {}
