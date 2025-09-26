import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Trip, TripMember, Day, Activity, Category } from './domain/entities'

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripMember, Day, Activity, Category])
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class TripsModule {}