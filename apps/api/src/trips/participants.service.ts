import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiErrorCode, type ParticipantRole as Role, type TripDetail } from '@7trip/shared';
import { apiError } from '../common/api-error.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService, type TripWithRelations } from './trips.service.js';

const participantNotFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Participant introuvable');
const lastOrganizer = (message: string) => apiError(HttpStatus.CONFLICT, ApiErrorCode.LastOrganizer, message);

/** Roles, removal and leaving. A trip always keeps at least one organizer. */
@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  async updateRole(userId: string, tripId: string, participantId: string, role: Role): Promise<TripDetail> {
    const trip = await this.trips.findForMember(userId, tripId);
    this.trips.require(trip, userId, 'manageParticipants');
    const target = this.activeParticipant(trip, participantId);

    await this.withTripLock(tripId, async (tx) => {
      if (target.role === ParticipantRole.ORGANIZER && role === ParticipantRole.PARTICIPANT && (await this.organizerCount(tx, tripId)) <= 1) {
        throw lastOrganizer('Il faut au moins un organisateur : nomme quelqu’un d’autre avant.');
      }
      await tx.participant.update({ where: { id: target.id }, data: { role } });
    });
    return this.detail(userId, tripId);
  }

  /** An organizer removes someone else. Their content stays, shown as "(parti)". */
  async remove(userId: string, tripId: string, participantId: string): Promise<TripDetail> {
    const trip = await this.trips.findForMember(userId, tripId);
    this.trips.require(trip, userId, 'manageParticipants');
    const target = this.activeParticipant(trip, participantId);
    if (target.userId === userId) {
      throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'Pour partir toi-même, utilise « Quitter le voyage ».');
    }
    await this.prisma.participant.update({ where: { id: target.id }, data: { status: ParticipantStatus.LEFT, leftAt: new Date() } });
    return this.detail(userId, tripId);
  }

  async leave(userId: string, tripId: string): Promise<void> {
    const trip = await this.trips.findForMember(userId, tripId);
    const me = trip.participants.find((p) => p.userId === userId)!;

    await this.withTripLock(tripId, async (tx) => {
      if (me.role === ParticipantRole.ORGANIZER && (await this.organizerCount(tx, tripId)) <= 1) {
        const others = await tx.participant.count({ where: { tripId, status: ParticipantStatus.ACTIVE, NOT: { id: me.id } } });
        throw lastOrganizer(
          others > 0
            ? 'Tu es le seul organisateur : nomme quelqu’un d’autre avant de partir.'
            : 'Tu es seul dans ce voyage : supprime-le plutôt.',
        );
      }
      await tx.participant.update({ where: { id: me.id }, data: { status: ParticipantStatus.LEFT, leftAt: new Date() } });
    });
  }

  private activeParticipant(trip: TripWithRelations, participantId: string) {
    const target = trip.participants.find((p) => p.id === participantId);
    if (!target) throw participantNotFound();
    return target;
  }

  private organizerCount(tx: Prisma.TransactionClient, tripId: string): Promise<number> {
    return tx.participant.count({ where: { tripId, status: ParticipantStatus.ACTIVE, role: ParticipantRole.ORGANIZER } });
  }

  /** Serialises role changes of one trip, so two organizers cannot demote each other at once. */
  private withTripLock(tripId: string, fn: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${tripId}::uuid FOR UPDATE`;
      await fn(tx);
    });
  }

  private async detail(userId: string, tripId: string): Promise<TripDetail> {
    return this.trips.toDetail(await this.trips.findForMember(userId, tripId), userId);
  }
}
