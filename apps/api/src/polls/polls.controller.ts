import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { applyPollRequestSchema, createPollRequestSchema, votePollRequestSchema, type Poll } from '@7trip/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from '../trips/actor.js';
import { CurrentActor, TripMemberGuard } from '../trips/trip-member.guard.js';
import { PollsService, type CreatePollInput } from './polls.service.js';

/** Open to every member of the trip, guests included; closing and applying are for organizers. */
@Controller('trips/:tripId/polls')
@UseGuards(TripMemberGuard)
export class PollsController {
  constructor(private readonly polls: PollsService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<Poll[]> {
    return this.polls.list(actor, tripId);
  }

  @Post()
  create(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(createPollRequestSchema)) body: CreatePollInput,
  ): Promise<Poll> {
    return this.polls.create(actor, tripId, body);
  }

  @Get(':pollId')
  get(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('pollId') pollId: string): Promise<Poll> {
    return this.polls.get(actor, tripId, pollId);
  }

  @Put(':pollId/vote')
  vote(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('pollId') pollId: string,
    @Body(new ZodValidationPipe(votePollRequestSchema)) body: { optionIds: string[] },
  ): Promise<Poll> {
    return this.polls.vote(actor, tripId, pollId, body.optionIds);
  }

  @Post(':pollId/close')
  @HttpCode(HttpStatus.OK)
  close(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('pollId') pollId: string): Promise<Poll> {
    return this.polls.close(actor, tripId, pollId);
  }

  @Post(':pollId/apply')
  @HttpCode(HttpStatus.OK)
  apply(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('pollId') pollId: string,
    @Body(new ZodValidationPipe(applyPollRequestSchema)) body: { optionId: string },
  ): Promise<Poll> {
    return this.polls.apply(actor, tripId, pollId, body.optionId);
  }

  @Delete(':pollId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('pollId') pollId: string): Promise<void> {
    return this.polls.remove(actor, tripId, pollId);
  }
}

/** A shared poll link (7trip.fr/s/<pollId>) knows only the poll: this finds its trip, for members. */
@Controller('polls')
@UseGuards(TripMemberGuard)
export class PollLinksController {
  constructor(private readonly polls: PollsService) {}

  @Get(':pollId')
  get(@CurrentActor() actor: Actor, @Param('pollId') pollId: string): Promise<Poll> {
    return this.polls.getByLink(actor, pollId);
  }
}
