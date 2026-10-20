import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  TRIP_COLORS,
  type TripColorKey,
  type TripDetail,
  type TripIconKey,
  type TripSummary,
} from '@7trip/shared';
import { z } from 'zod';
import { apiError } from '../common/api-error.js';
import type { Participant, Trip } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus, type TripKind } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface TripInput {
  title?: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  kind?: 'SOLO' | 'GROUP';
  color?: TripColorKey;
  icon?: TripIconKey;
}

type TripWithParticipants = Trip & { participants: Participant[] };

interface TripColumns {
  title?: string;
  destination?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  kind?: TripKind;
  color?: string;
  icon?: string;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);
const notFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Voyage introuvable');

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
      },
      include: { participants: true },
    });
    return this.toDetail(trip, userId);
  }

  async listForUser(userId: string): Promise<TripSummary[]> {
    const trips = await this.prisma.trip.findMany({
      where: { participants: { some: { userId, status: ParticipantStatus.ACTIVE } } },
      include: { participants: { where: { status: ParticipantStatus.ACTIVE } } },
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
    this.requireOrganizer(trip, userId);

    // Validate the resulting date range, not just the fields sent in this request.
    const startDate = input.startDate !== undefined ? input.startDate : toIso(trip.startDate);
    const endDate = input.endDate !== undefined ? input.endDate : toIso(trip.endDate);
    if (startDate && endDate && endDate < startDate) {
      throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'La date de fin doit être après la date de début');
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: this.toData(input),
      include: { participants: { where: { status: ParticipantStatus.ACTIVE } } },
    });
    return this.toDetail(updated, userId);
  }

  /** Loads a trip the user belongs to. Non-members get a 404: a trip's existence is not revealed. */
  private async findForMember(userId: string, tripId: string): Promise<TripWithParticipants> {
    if (!z.uuid().safeParse(tripId).success) throw notFound();
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, participants: { some: { userId, status: ParticipantStatus.ACTIVE } } },
      include: { participants: { where: { status: ParticipantStatus.ACTIVE } } },
    });
    if (!trip) throw notFound();
    return trip;
  }

  private requireOrganizer(trip: TripWithParticipants, userId: string): void {
    const me = trip.participants.find((p) => p.userId === userId);
    if (me?.role !== ParticipantRole.ORGANIZER) {
      throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, 'Seuls les organisateurs peuvent faire cette modification');
    }
  }

  /** Scalar columns from the request, ready for both create and update. */
  private toData(input: TripInput): TripColumns {
    return {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.destination !== undefined && { destination: input.destination || null }),
      ...(input.startDate !== undefined && { startDate: input.startDate ? toDate(input.startDate) : null }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? toDate(input.endDate) : null }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
    };
  }

  private toSummary(trip: TripWithParticipants, userId: string): TripSummary {
    const me = trip.participants.find((p) => p.userId === userId);
    return {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      startDate: toIso(trip.startDate),
      endDate: toIso(trip.endDate),
      kind: trip.kind,
      color: trip.color as TripColorKey,
      icon: trip.icon as TripIconKey,
      participantCount: trip.participants.length,
      myRole: me?.role ?? ParticipantRole.PARTICIPANT,
    };
  }

  private toDetail(trip: TripWithParticipants, userId: string): TripDetail {
    return {
      ...this.toSummary(trip, userId),
      createdAt: trip.createdAt.toISOString(),
      participants: trip.participants
        .toSorted((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
        .map((p) => ({ id: p.id, displayName: p.displayName, role: p.role, isMe: p.userId === userId })),
    };
  }
}
