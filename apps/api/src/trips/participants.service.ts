import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiErrorCode, type ParticipantRole as Role, type TripDetail } from '@7trip/shared';
import { apiError } from '../common/api-error.js';
import type { Prisma } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus } from '../generated/prisma/enums.js';
import { TripsService, assertCan } from './trips.service.js';

const participantNotFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Participant introuvable');
const lastOrganizer = (message: string) => apiError(HttpStatus.CONFLICT, ApiErrorCode.LastOrganizer, message);

/**
 * Roles, removal and leaving. A trip always keeps at least one organizer: every change runs under
 * the trip lock and re-reads roles there (TripsService.withTripLock).
 */
@Injectable()
export class ParticipantsService {
  constructor(private readonly trips: TripsService) {}

  async updateRole(userId: string, tripId: string, participantId: string, role: Role): Promise<TripDetail> {
    await this.trips.withTripLock(userId, tripId, async (tx, trip) => {
      assertCan(trip.me.role, 'manageParticipants', trip);
      const target = await this.activeParticipant(tx, tripId, participantId);
      if (target.role === ParticipantRole.ORGANIZER && role === ParticipantRole.PARTICIPANT && (await this.organizerCount(tx, tripId)) <= 1) {
        throw lastOrganizer('Il faut au moins un organisateur : nomme quelqu’un d’autre avant.');
      }
      await tx.participant.update({ where: { id: target.id }, data: { role } });
    });
    return this.detail(userId, tripId);
  }

  /** An organizer removes someone else. Their content stays, shown as "(parti)". */
  async remove(userId: string, tripId: string, participantId: string): Promise<TripDetail> {
    await this.trips.withTripLock(userId, tripId, async (tx, trip) => {
      assertCan(trip.me.role, 'manageParticipants', trip);
      const target = await this.activeParticipant(tx, tripId, participantId);
      if (target.id === trip.me.id) {
        throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'Pour partir toi-même, utilise « Quitter le voyage ».');
      }
      await tx.participant.update({ where: { id: target.id }, data: { status: ParticipantStatus.LEFT, leftAt: new Date() } });
    });
    return this.detail(userId, tripId);
  }

  async leave(userId: string, tripId: string): Promise<void> {
    await this.trips.withTripLock(userId, tripId, async (tx, { me }) => {
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

  private async activeParticipant(tx: Prisma.TransactionClient, tripId: string, participantId: string) {
    const target = await tx.participant.findFirst({ where: { id: participantId, tripId, status: ParticipantStatus.ACTIVE } });
    if (!target) throw participantNotFound();
    return target;
  }

  private organizerCount(tx: Prisma.TransactionClient, tripId: string): Promise<number> {
    return tx.participant.count({ where: { tripId, status: ParticipantStatus.ACTIVE, role: ParticipantRole.ORGANIZER } });
  }

  private async detail(userId: string, tripId: string): Promise<TripDetail> {
    return this.trips.toDetail(await this.trips.findForMember(userId, tripId), userId);
  }
}
