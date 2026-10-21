import { randomInt } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  INVITATION_CODE_ALPHABET,
  INVITATION_CODE_LENGTH,
  type InvitationPreview,
  type TripColorKey,
  type TripDetail,
  type TripIconKey,
  type TripInvitation,
} from '@7trip/shared';
import { apiError } from '../common/api-error.js';
import type { Invitation } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus, TripKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService } from './trips.service.js';

const invalidInvitation = () =>
  apiError(HttpStatus.NOT_FOUND, ApiErrorCode.InvitationInvalid, 'Ce lien d’invitation n’est plus valable. Demande-en un nouveau.');

function newCode(): string {
  return Array.from({ length: INVITATION_CODE_LENGTH }, () => INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)]).join('');
}

const toInvitation = (invitation: Invitation): TripInvitation => ({
  code: invitation.code,
  createdAt: invitation.createdAt.toISOString(),
});

/** The group link of a trip: one active code, renewable, joining always as participant. */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  /** The active link, created on first use. */
  async current(userId: string, tripId: string): Promise<TripInvitation> {
    const trip = await this.trips.findForMember(userId, tripId);
    this.trips.require(trip, userId, 'invite');
    const active = await this.prisma.invitation.findFirst({ where: { tripId, revokedAt: null }, orderBy: { createdAt: 'desc' } });
    if (active) return toInvitation(active);
    return toInvitation(await this.prisma.invitation.create({ data: { tripId, code: newCode(), createdById: userId } }));
  }

  /** Revokes the current link and creates a new one: the old code stops working. */
  async renew(userId: string, tripId: string): Promise<TripInvitation> {
    const trip = await this.trips.findForMember(userId, tripId);
    this.trips.require(trip, userId, 'renewInvitation');
    const [, created] = await this.prisma.$transaction([
      this.prisma.invitation.updateMany({ where: { tripId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.invitation.create({ data: { tripId, code: newCode(), createdById: userId } }),
    ]);
    return toInvitation(created);
  }

  async preview(userId: string, code: string): Promise<InvitationPreview> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { code, revokedAt: null },
      include: {
        trip: {
          include: {
            participants: { where: { status: ParticipantStatus.ACTIVE }, orderBy: { joinedAt: 'asc' } },
            destinations: { orderBy: { position: 'asc' } },
          },
        },
      },
    });
    if (!invitation) throw invalidInvitation();
    const { trip } = invitation;
    return {
      code,
      tripId: trip.id,
      title: trip.title,
      destinations: trip.destinations.map((d) => d.name),
      startDate: trip.startDate?.toISOString().slice(0, 10) ?? null,
      endDate: trip.endDate?.toISOString().slice(0, 10) ?? null,
      color: trip.color as TripColorKey,
      icon: trip.icon as TripIconKey,
      participantCount: trip.participants.length,
      organizers: trip.participants.filter((p) => p.role === ParticipantRole.ORGANIZER).map((p) => p.displayName),
      alreadyMember: trip.participants.some((p) => p.userId === userId),
    };
  }

  /** Joins as participant. Idempotent; someone who left comes back as a participant. */
  async join(userId: string, code: string): Promise<TripDetail> {
    const invitation = await this.prisma.invitation.findFirst({ where: { code, revokedAt: null } });
    if (!invitation) throw invalidInvitation();
    const { tripId } = invitation;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.participant.findUnique({ where: { tripId_userId: { tripId, userId } } });
      if (existing?.status === ParticipantStatus.ACTIVE) return;
      await tx.participant.upsert({
        where: { tripId_userId: { tripId, userId } },
        create: { tripId, userId, displayName: user.displayName, role: ParticipantRole.PARTICIPANT },
        update: {
          status: ParticipantStatus.ACTIVE,
          role: ParticipantRole.PARTICIPANT,
          displayName: user.displayName,
          joinedAt: new Date(),
          leftAt: null,
        },
      });
      await tx.invitation.update({ where: { id: invitation.id }, data: { usesCount: { increment: 1 } } });
      // Someone joining a solo trip makes it a group trip.
      await tx.trip.updateMany({ where: { id: tripId, kind: TripKind.SOLO }, data: { kind: TripKind.GROUP } });
    });

    return this.trips.toDetail(await this.trips.findForMember(userId, tripId), userId);
  }
}
