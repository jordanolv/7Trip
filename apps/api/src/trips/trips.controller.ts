import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createTripRequestSchema,
  updateTripRequestSchema,
  type TripDetail,
  type TripSummary,
} from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId } from '../auth/access-token.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from './actor.js';
import { CurrentActor, TripMemberGuard } from './trip-member.guard.js';
import { TripsService } from './trips.service.js';

/** Account routes use AccessTokenGuard; routes of one trip are also open to its guests. */
@Controller()
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('me/trips')
  @UseGuards(AccessTokenGuard)
  list(@CurrentUserId() userId: string): Promise<TripSummary[]> {
    return this.trips.listForUser(userId);
  }

  @Post('trips')
  @UseGuards(AccessTokenGuard)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(createTripRequestSchema)) body: z.output<typeof createTripRequestSchema>,
  ): Promise<TripDetail> {
    return this.trips.create(userId, body);
  }

  @Get('trips/:tripId')
  @UseGuards(TripMemberGuard)
  get(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<TripDetail> {
    return this.trips.get(actor, tripId);
  }

  @Patch('trips/:tripId')
  @UseGuards(TripMemberGuard)
  update(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(updateTripRequestSchema)) body: z.output<typeof updateTripRequestSchema>,
  ): Promise<TripDetail> {
    return this.trips.update(actor, tripId, body);
  }

  @Delete('trips/:tripId')
  @UseGuards(TripMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<void> {
    return this.trips.remove(actor, tripId);
  }
}
