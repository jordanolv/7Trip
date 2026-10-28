import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createEventRequestSchema, updateEventRequestSchema, type TripEvent } from '@7trip/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from '../trips/actor.js';
import { CurrentActor, TripMemberGuard } from '../trips/trip-member.guard.js';
import { EventsService, type CreateEventInput, type UpdateEventInput } from './events.service.js';

/** Open to every member of the trip, guests included. */
@Controller('trips/:tripId/events')
@UseGuards(TripMemberGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<TripEvent[]> {
    return this.events.list(actor, tripId);
  }

  @Post()
  create(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(createEventRequestSchema)) body: CreateEventInput,
  ): Promise<TripEvent> {
    return this.events.create(actor, tripId, body);
  }

  @Get(':eventId')
  get(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('eventId') eventId: string): Promise<TripEvent> {
    return this.events.get(actor, tripId, eventId);
  }

  @Patch(':eventId')
  update(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateEventRequestSchema)) body: UpdateEventInput,
  ): Promise<TripEvent> {
    return this.events.update(actor, tripId, eventId, body);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('eventId') eventId: string): Promise<void> {
    return this.events.remove(actor, tripId, eventId);
  }
}
