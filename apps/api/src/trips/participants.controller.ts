import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  claimGuestSessionsRequestSchema,
  guestJoinRequestSchema,
  updateParticipantRequestSchema,
  type GuestJoinResponse,
  type InvitationPreview,
  type TripDetail,
  type TripInvitation,
} from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId, OptionalAccessTokenGuard, OptionalUserId } from '../auth/access-token.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { Actor } from './actor.js';
import { GuestSessionsService } from './guest-sessions.service.js';
import { InvitationsService } from './invitations.service.js';
import { ParticipantsService } from './participants.service.js';
import { CurrentActor, TripMemberGuard } from './trip-member.guard.js';

@Controller()
export class ParticipantsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly participants: ParticipantsService,
    private readonly guestSessions: GuestSessionsService,
  ) {}

  @Get('trips/:tripId/invitation')
  @UseGuards(TripMemberGuard)
  invitation(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<TripInvitation> {
    return this.invitations.current(actor, tripId);
  }

  @Post('trips/:tripId/invitation/renew')
  @UseGuards(TripMemberGuard)
  renewInvitation(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<TripInvitation> {
    return this.invitations.renew(actor, tripId);
  }

  // Public (the guest web and signed-out app show it). Codes are short: rate-limit lookups like the auth endpoints.
  @Get('invitations/:code')
  @UseGuards(ThrottlerGuard, OptionalAccessTokenGuard)
  preview(@OptionalUserId() userId: string | null, @Param('code') code: string): Promise<InvitationPreview> {
    return this.invitations.preview(userId, code.toLowerCase());
  }

  @Post('invitations/:code/join')
  @UseGuards(ThrottlerGuard, AccessTokenGuard)
  join(@CurrentUserId() userId: string, @Param('code') code: string): Promise<TripDetail> {
    return this.invitations.join(userId, code.toLowerCase());
  }

  @Post('invitations/:code/join-guest')
  @UseGuards(ThrottlerGuard)
  joinAsGuest(
    @Param('code') code: string,
    @Body(new ZodValidationPipe(guestJoinRequestSchema)) body: z.output<typeof guestJoinRequestSchema>,
  ): Promise<GuestJoinResponse> {
    return this.invitations.joinAsGuest(code.toLowerCase(), body.displayName);
  }

  @Post('me/guest-sessions/claim')
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  claimGuestSessions(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(claimGuestSessionsRequestSchema)) body: z.output<typeof claimGuestSessionsRequestSchema>,
  ): Promise<void> {
    return this.guestSessions.claim(userId, body.tokens);
  }

  @Patch('trips/:tripId/participants/:participantId')
  @UseGuards(TripMemberGuard)
  updateRole(
    @CurrentActor() actor: Actor,
    @Param('tripId') tripId: string,
    @Param('participantId') participantId: string,
    @Body(new ZodValidationPipe(updateParticipantRequestSchema)) body: z.output<typeof updateParticipantRequestSchema>,
  ): Promise<TripDetail> {
    return this.participants.updateRole(actor, tripId, participantId, body.role);
  }

  @Delete('trips/:tripId/participants/:participantId')
  @UseGuards(TripMemberGuard)
  remove(@CurrentActor() actor: Actor, @Param('tripId') tripId: string, @Param('participantId') participantId: string): Promise<TripDetail> {
    return this.participants.remove(actor, tripId, participantId);
  }

  @Post('trips/:tripId/leave')
  @UseGuards(TripMemberGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentActor() actor: Actor, @Param('tripId') tripId: string): Promise<void> {
    return this.participants.leave(actor, tripId);
  }
}
