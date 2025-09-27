import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Trip, TripMember, Day, Activity, Category } from './domain/entities'
import { TripsController } from './presentation/controllers/trips.controller'
import { TripsService } from './application/services/trips.service'
import { TripsRepository } from './infrastructure/repositories/trips.repository'
import { ITripsRepository } from './domain/repositories/trips.repository.interface'

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripMember, Day, Activity, Category])
  ],
  controllers: [TripsController],
  providers: [
    TripsService,
    {
      provide: 'ITripsRepository',
      useClass: TripsRepository,
    },
  ],
  exports: [TripsService],
})
export class TripsModule {}