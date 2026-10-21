import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  updateParticipantRequestSchema,
  type InvitationPreview,
  type TripDetail,
  type TripInvitation,
} from '@7trip/shared';
import type { z } from 'zod';
import { AccessTokenGuard, CurrentUserId } from '../auth/access-token.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { InvitationsService } from './invitations.service.js';
import { ParticipantsService } from './participants.service.js';

@Controller()
@UseGuards(AccessTokenGuard)
export class ParticipantsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly participants: ParticipantsService,
  ) {}

  @Get('trips/:tripId/invitation')
  invitation(@CurrentUserId() userId: string, @Param('tripId') tripId: string): Promise<TripInvitation> {
    return this.invitations.current(userId, tripId);
  }

  @Post('trips/:tripId/invitation/renew')
  renewInvitation(@CurrentUserId() userId: string, @Param('tripId') tripId: string): Promise<TripInvitation> {
    return this.invitations.renew(userId, tripId);
  }

  // Codes are short: rate-limit lookups like the auth endpoints.
  @Get('invitations/:code')
  @UseGuards(ThrottlerGuard)
  preview(@CurrentUserId() userId: string, @Param('code') code: string): Promise<InvitationPreview> {
    return this.invitations.preview(userId, code.toLowerCase());
  }

  @Post('invitations/:code/join')
  @UseGuards(ThrottlerGuard)
  join(@CurrentUserId() userId: string, @Param('code') code: string): Promise<TripDetail> {
    return this.invitations.join(userId, code.toLowerCase());
  }

  @Patch('trips/:tripId/participants/:participantId')
  updateRole(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Param('participantId') participantId: string,
    @Body(new ZodValidationPipe(updateParticipantRequestSchema)) body: z.output<typeof updateParticipantRequestSchema>,
  ): Promise<TripDetail> {
    return this.participants.updateRole(userId, tripId, participantId, body.role);
  }

  @Delete('trips/:tripId/participants/:participantId')
  remove(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Param('participantId') participantId: string,
  ): Promise<TripDetail> {
    return this.participants.remove(userId, tripId, participantId);
  }

  @Post('trips/:tripId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUserId() userId: string, @Param('tripId') tripId: string): Promise<void> {
    return this.participants.leave(userId, tripId);
  }
}
