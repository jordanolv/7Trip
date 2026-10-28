import { randomInt } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  INVITATION_CODE_ALPHABET,
  INVITATION_CODE_LENGTH,
  type InvitationPreview,
  type TripColorKey,
  type GuestJoinResponse,
  type TripDetail,
  type TripIconKey,
  type TripInvitation,
} from '@7trip/shared';
import { apiError } from '../common/api-error.js';
import { randomToken, sha256 } from '../auth/crypto.js';
import type { Invitation, Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus, TripKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { userActor, type Actor } from './actor.js';
import { TripsService, assertCan } from './trips.service.js';

const invalidInvitation = () =>
  apiError(HttpStatus.NOT_FOUND, ApiErrorCode.InvitationInvalid, 'Ce lien d’invitation n’est plus valable. Demande-en un nouveau.');

function newCode(): string {
  return Array.from({ length: INVITATION_CODE_LENGTH }, () => INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)]).join('');
}

/** The account behind a participant that passed assertCan(), which rejects guests. */
function accountOf(me: Participant): string {
  if (!me.userId) throw new Error('Guest participant reached an account-only action');
  return me.userId;
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

  /** The active link, created on first use. Under the trip lock: never two active links. */
  current(actor: Actor, tripId: string): Promise<TripInvitation> {
    return this.trips.withTripLock(actor, tripId, async (tx, trip) => {
      assertCan(trip.me, 'invite', trip);
      const active = await tx.invitation.findFirst({ where: { tripId, revokedAt: null }, orderBy: { createdAt: 'desc' } });
      return toInvitation(active ?? (await tx.invitation.create({ data: { tripId, code: newCode(), createdById: accountOf(trip.me) } })));
    });
  }

  /** Revokes the current link and creates a new one: the old code stops working. */
  renew(actor: Actor, tripId: string): Promise<TripInvitation> {
    return this.trips.withTripLock(actor, tripId, async (tx, trip) => {
      assertCan(trip.me, 'renewInvitation', trip);
      await tx.invitation.updateMany({ where: { tripId, revokedAt: null }, data: { revokedAt: new Date() } });
      return toInvitation(await tx.invitation.create({ data: { tripId, code: newCode(), createdById: accountOf(trip.me) } }));
    });
  }

  /** Public: anyone with the code sees who invites them. `alreadyMember` needs a signed-in user. */
  async preview(userId: string | null, code: string): Promise<InvitationPreview> {
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
      alreadyMember: userId !== null && trip.participants.some((p) => p.userId === userId),
    };
  }

  /** Joins as participant. Idempotent; someone who left comes back as a participant. */
  async join(userId: string, code: string): Promise<TripDetail> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const tripId = await this.admit(code, async (tx, tripId) => {
      const existing = await tx.participant.findUnique({ where: { tripId_userId: { tripId, userId } } });
      if (existing?.status === ParticipantStatus.ACTIVE) return false;
      await tx.participant.upsert({
        where: { tripId_userId: { tripId, userId } },
        create: { tripId, userId, displayName: user.displayName, avatarColor: user.avatarColor, role: ParticipantRole.PARTICIPANT },
        update: {
          status: ParticipantStatus.ACTIVE,
          role: ParticipantRole.PARTICIPANT,
          displayName: user.displayName,
          avatarColor: user.avatarColor,
          joinedAt: new Date(),
          leftAt: null,
        },
      });
      return true;
    });
    const actor = userActor(userId);
    return this.trips.toDetail(await this.trips.findForMember(actor, tripId), actor);
  }

  /** Joins without an account: a new guest participant, and the session token that opens this trip. */
  async joinAsGuest(code: string, displayName: string): Promise<GuestJoinResponse> {
    const token = randomToken();
    let participantId = '';
    const tripId = await this.admit(code, async (tx, tripId) => {
      const guest = await tx.participant.create({
        data: { tripId, displayName, role: ParticipantRole.PARTICIPANT, guestTokenHash: sha256(token) },
      });
      participantId = guest.id;
      return true;
    });
    const actor: Actor = { kind: 'guest', participantId };
    return { token, trip: this.trips.toDetail(await this.trips.findForMember(actor, tripId), actor) };
  }

  /**
   * Runs `add` under the trip lock, after checking the link is still valid there (a link renewed
   * meanwhile is seen as revoked). `add` returns whether someone joined, to count the use.
   */
  private async admit(code: string, add: (tx: Prisma.TransactionClient, tripId: string) => Promise<boolean>): Promise<string> {
    const invitation = await this.prisma.invitation.findFirst({ where: { code, revokedAt: null } });
    if (!invitation) throw invalidInvitation();
    const { tripId } = invitation;

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${tripId}::uuid FOR UPDATE`;
      const stillValid = await tx.invitation.findFirst({ where: { id: invitation.id, revokedAt: null } });
      if (!stillValid) throw invalidInvitation();
      if (!(await add(tx, tripId))) return;
      await tx.invitation.update({ where: { id: invitation.id }, data: { usesCount: { increment: 1 } } });
      // Someone joining a solo trip makes it a group trip.
      await tx.trip.updateMany({ where: { id: tripId, kind: TripKind.SOLO }, data: { kind: TripKind.GROUP } });
    });
    return tripId;
  }
}
