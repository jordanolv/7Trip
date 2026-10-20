import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createTripRequestSchema,
  updateTripRequestSchema,
  type TripDetail,
  type TripSummary,
} from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId } from '../auth/access-token.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { TripsService } from './trips.service.js';

@Controller()
@UseGuards(AccessTokenGuard)
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('me/trips')
  list(@CurrentUserId() userId: string): Promise<TripSummary[]> {
    return this.trips.listForUser(userId);
  }

  @Post('trips')
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createTripRequestSchema)) body: z.output<typeof createTripRequestSchema>,
  ): Promise<TripDetail> {
    return this.trips.create(userId, body);
  }

  @Get('trips/:tripId')
  get(@CurrentUserId() userId: string, @Param('tripId') tripId: string): Promise<TripDetail> {
    return this.trips.get(userId, tripId);
  }

  @Patch('trips/:tripId')
  update(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(updateTripRequestSchema)) body: z.output<typeof updateTripRequestSchema>,
  ): Promise<TripDetail> {
    return this.trips.update(userId, tripId, body);
  }
}
