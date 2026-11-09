import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { placeDetailsQuerySchema, placeIdSchema, placeSearchQuerySchema, type PlaceDetails, type PlaceSuggestion } from '@7trip/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from '../trips/actor.js';
import { CurrentActor, TripMemberGuard } from '../trips/trip-member.guard.js';
import { TripsService } from '../trips/trips.service.js';
import { PlacesService } from './places.service.js';

/** Picking a place for an idea or an event: open to every member of the trip, guests included. */
@Controller('trips/:tripId/places')
@UseGuards(TripMemberGuard)
export class PlacesController {
  constructor(
    private readonly places: PlacesService,
    private readonly trips: TripsService,
  ) {}

  @Get()
  async search(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Query(new ZodValidationPipe(placeSearchQuerySchema)) query: { q: string; session: string },
  ): Promise<PlaceSuggestion[]> {
    // Each search costs: members of the trip only.
    const me = await this.trips.member(actor, tripId);
    return this.places.search(me.id, tripId, query.q, query.session);
  }

  @Get(':placeId')
  async lookup(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('placeId', new ZodValidationPipe(placeIdSchema)) placeId: string,
    @Query(new ZodValidationPipe(placeDetailsQuerySchema)) query: { session?: string },
  ): Promise<PlaceDetails> {
    await this.trips.member(actor, tripId);
    return this.places.lookup(placeId, query.session);
  }
}
