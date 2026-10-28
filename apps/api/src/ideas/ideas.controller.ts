import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { createIdeaRequestSchema, markIdeasSeenRequestSchema, updateIdeaRequestSchema, type Idea, type UnseenIdeas } from '@7trip/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from '../trips/actor.js';
import { CurrentActor, TripMemberGuard } from '../trips/trip-member.guard.js';
import { IdeasService, type CreateIdeaInput, type UpdateIdeaInput } from './ideas.service.js';

/** Open to every member of the trip, guests included. */
@Controller('trips/:tripId/ideas')
@UseGuards(TripMemberGuard)
export class IdeasController {
  constructor(private readonly ideas: IdeasService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<Idea[]> {
    return this.ideas.list(actor, tripId);
  }

  @Post()
  create(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(createIdeaRequestSchema)) body: CreateIdeaInput,
  ): Promise<Idea> {
    return this.ideas.create(actor, tripId, body);
  }

  // Before ':ideaId', which would otherwise match them.
  @Get('unseen')
  unseen(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<UnseenIdeas> {
    return this.ideas.unseen(actor, tripId);
  }

  @Post('seen')
  @HttpCode(HttpStatus.NO_CONTENT)
  markSeen(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Body(new ZodValidationPipe(markIdeasSeenRequestSchema)) body: { until: string },
  ): Promise<void> {
    return this.ideas.markSeen(actor, tripId, new Date(body.until));
  }

  @Get(':ideaId')
  get(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('ideaId') ideaId: string): Promise<Idea> {
    return this.ideas.get(actor, tripId, ideaId);
  }

  @Patch(':ideaId')
  update(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('ideaId') ideaId: string,
    @Body(new ZodValidationPipe(updateIdeaRequestSchema)) body: UpdateIdeaInput,
  ): Promise<Idea> {
    return this.ideas.update(actor, tripId, ideaId, body);
  }

  @Delete(':ideaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('ideaId') ideaId: string): Promise<void> {
    return this.ideas.remove(actor, tripId, ideaId);
  }
}
