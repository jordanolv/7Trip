import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  TRIP_COLORS,
  canDo,
  type InvitePolicy,
  type TripAction,
  type TripColorKey,
  type TripDetail,
  type TripIconKey,
  type TripSummary,
} from '@7trip/shared';
import { z } from 'zod';
import { apiError } from '../common/api-error.js';
import type { Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus, type TripKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TripInput {
  title?: string;
  destinations?: string[];
  startDate?: string | null;
  endDate?: string | null;
  kind?: 'SOLO' | 'GROUP';
  color?: TripColorKey;
  icon?: TripIconKey;
  invitePolicy?: InvitePolicy;
}

const TRIP_INCLUDE = {
  participants: { where: { status: ParticipantStatus.ACTIVE } },
  destinations: { orderBy: { position: 'asc' } },
} satisfies Prisma.TripInclude;

export type TripWithRelations = Prisma.TripGetPayload<{ include: typeof TRIP_INCLUDE }>;

interface TripColumns {
  title?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  kind?: TripKind;
  color?: string;
  icon?: string;
  invitePolicy?: InvitePolicy;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);
const toStops = (names: string[]) => names.map((name, position) => ({ name, position }));
export const notFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Voyage introuvable');

export interface LockedTrip {
  invitePolicy: InvitePolicy;
  me: Participant;
}

export function assertCan(role: ParticipantRole | undefined, action: TripAction, trip: { invitePolicy: InvitePolicy }): void {
  if (!role || !canDo(action, role, trip)) {
    throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, FORBIDDEN_MESSAGES[action]);
  }
}

const FORBIDDEN_MESSAGES: Record<TripAction, string> = {
  invite: 'Seuls les organisateurs peuvent inviter dans ce voyage',
  renewInvitation: 'Seuls les organisateurs peuvent renouveler le lien',
  manageParticipants: 'Seuls les organisateurs peuvent gérer les participants',
  editTrip: 'Seuls les organisateurs peuvent faire cette modification',
  deleteTrip: 'Seuls les organisateurs peuvent supprimer le voyage',
};

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: TripInput & { title: string }): Promise<TripDetail> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.emailVerifiedAt) {
      throw apiError(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.EmailNotVerified,
        'Confirme ton adresse email pour créer un voyage',
      );
    }
    // Vary the default colour from one trip to the next.
    const count = await this.prisma.participant.count({ where: { userId } });
    const trip = await this.prisma.trip.create({
      data: {
        ...this.toData(input),
        title: input.title,
        color: input.color ?? TRIP_COLORS[count % TRIP_COLORS.length]!,
        icon: input.icon ?? 'suitcase',
        createdById: userId,
        participants: {
          create: { userId, displayName: user.displayName, role: ParticipantRole.ORGANIZER },
        },
        destinations: { create: toStops(input.destinations ?? []) },
      },
      include: TRIP_INCLUDE,
    });
    return this.toDetail(trip, userId);
  }

  async listForUser(userId: string): Promise<TripSummary[]> {
    const trips = await this.prisma.trip.findMany({
      where: { participants: { some: { userId, status: ParticipantStatus.ACTIVE } } },
      include: TRIP_INCLUDE,
      orderBy: [{ startDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    return trips.map((trip) => this.toSummary(trip, userId));
  }

  async get(userId: string, tripId: string): Promise<TripDetail> {
    const trip = await this.findForMember(userId, tripId);
    return this.toDetail(trip, userId);
  }

  async update(userId: string, tripId: string, input: TripInput): Promise<TripDetail> {
    const trip = await this.findForMember(userId, tripId);
    this.require(trip, userId, 'editTrip');

    // Validate the resulting date range, not just the fields sent in this request.
    const startDate = input.startDate !== undefined ? input.startDate : toIso(trip.startDate);
    const endDate = input.endDate !== undefined ? input.endDate : toIso(trip.endDate);
    if (startDate && endDate && endDate < startDate) {
      throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'La date de fin doit être après la date de début');
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        ...this.toData(input),
        // The list is replaced as a whole, in the same statement as the other fields.
        ...(input.destinations !== undefined && {
          destinations: { deleteMany: {}, create: toStops(input.destinations) },
        }),
      },
      include: TRIP_INCLUDE,
    });
    return this.toDetail(updated, userId);
  }

  /** Loads a trip the user belongs to. Non-members get a 404: a trip's existence is not revealed. */
  /** Deletes the trip for everyone (participants and destinations cascade). Organizers only. */
  async remove(userId: string, tripId: string): Promise<void> {
    const trip = await this.findForMember(userId, tripId);
    this.require(trip, userId, 'deleteTrip');
    await this.prisma.trip.delete({ where: { id: tripId } });
  }

  /** The trip with its active participants, or 404 when the user is not one of them. */
  async findForMember(userId: string, tripId: string): Promise<TripWithRelations> {
    if (!z.uuid().safeParse(tripId).success) throw notFound();
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, participants: { some: { userId, status: ParticipantStatus.ACTIVE } } },
      include: TRIP_INCLUDE,
    });
    if (!trip) throw notFound();
    return trip;
  }

  /** Throws 403 unless the user's role allows the action (matrix in @7trip/shared). */
  require(trip: TripWithRelations, userId: string, action: TripAction): void {
    assertCan(trip.participants.find((p) => p.userId === userId)?.role, action, trip);
  }

  /**
   * Runs `fn` in a transaction holding a lock on the trip row, with the caller's membership read
   * inside it. Every membership or invitation change goes through here, so concurrent requests
   * are applied one after the other and always check permissions against the current state.
   */
  async withTripLock<T>(userId: string, tripId: string, fn: (tx: Prisma.TransactionClient, ctx: LockedTrip) => Promise<T>): Promise<T> {
    if (!z.uuid().safeParse(tripId).success) throw notFound();
    return this.prisma.$transaction(async (tx) => {
      const [trip] = await tx.$queryRaw<{ invitePolicy: InvitePolicy }[]>`
        SELECT "invitePolicy" FROM "Trip" WHERE id = ${tripId}::uuid FOR UPDATE`;
      const me = trip && (await tx.participant.findFirst({ where: { tripId, userId, status: ParticipantStatus.ACTIVE } }));
      if (!trip || !me) throw notFound();
      return fn(tx, { invitePolicy: trip.invitePolicy, me });
    });
  }

  /** Scalar columns from the request, ready for both create and update. */
  private toData(input: TripInput): TripColumns {
    return {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.startDate !== undefined && { startDate: input.startDate ? toDate(input.startDate) : null }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? toDate(input.endDate) : null }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.invitePolicy !== undefined && { invitePolicy: input.invitePolicy }),
    };
  }

  private toSummary(trip: TripWithRelations, userId: string): TripSummary {
    const me = trip.participants.find((p) => p.userId === userId);
    return {
      id: trip.id,
      title: trip.title,
      destinations: trip.destinations.map((d) => d.name),
      startDate: toIso(trip.startDate),
      endDate: toIso(trip.endDate),
      kind: trip.kind,
      color: trip.color as TripColorKey,
      icon: trip.icon as TripIconKey,
      participantCount: trip.participants.length,
      myRole: me?.role ?? ParticipantRole.PARTICIPANT,
    };
  }

  toDetail(trip: TripWithRelations, userId: string): TripDetail {
    return {
      ...this.toSummary(trip, userId),
      invitePolicy: trip.invitePolicy,
      createdAt: trip.createdAt.toISOString(),
      participants: trip.participants
        .toSorted((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
        .map((p) => ({ id: p.id, displayName: p.displayName, role: p.role, isMe: p.userId === userId })),
    };
  }
}
