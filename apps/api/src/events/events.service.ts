import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  canEditEvent,
  scheduleError,
  tripRangeError,
  type ApiErrorBody,
  type EventCategory,
  type TripEvent,
  type createEventRequestSchema,
  type updateEventRequestSchema,
} from '@7trip/shared';
import { z } from 'zod';
import { apiError } from '../common/api-error.js';
import type { Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../trips/actor.js';
import { toContentAuthor } from '../common/content-author.js';
import { TripsService } from '../trips/trips.service.js';

/** Validated request bodies (blank fields already turned into null). */
export type CreateEventInput = z.output<typeof createEventRequestSchema>;
export type UpdateEventInput = z.output<typeof updateEventRequestSchema>;

const EVENT_INCLUDE = {
  author: true,
  participants: { include: { participant: true }, orderBy: { participant: { joinedAt: 'asc' } } },
  idea: { include: { author: true } },
} satisfies Prisma.EventInclude;
type EventWithRelations = Prisma.EventGetPayload<{ include: typeof EVENT_INCLUDE }>;

const eventNotFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Événement introuvable');

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The planning (CDC §7). Everyone, guests included, adds events; the author, the organizers and
 * the people taking part edit them (docs/decisions.md). Overlaps are only flagged, by the apps.
 * Writes run under the trip lock, like ideas.
 */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  /** In timeline order. */
  async list(actor: Actor, tripId: string): Promise<TripEvent[]> {
    const me = await this.trips.member(actor, tripId);
    const events = await this.prisma.event.findMany({
      where: { tripId },
      include: EVENT_INCLUDE,
      orderBy: [{ startDate: 'asc' }, { startTime: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
    });
    return events.map((event) => toTripEvent(event, me));
  }

  async get(actor: Actor, tripId: string, eventId: string): Promise<TripEvent> {
    const me = await this.trips.member(actor, tripId);
    return toTripEvent(await this.find(this.prisma, tripId, eventId), me);
  }

  async create(actor: Actor, tripId: string, input: CreateEventInput): Promise<TripEvent> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      await assertParticipants(tx, tripId, input.participantIds);
      await assertWithinTrip(tx, tripId, input);
      if (input.ideaId) {
        const idea = await tx.idea.findFirst({ where: { id: input.ideaId, tripId }, include: { event: { select: { id: true } } } });
        if (!idea) throw apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Idée introuvable');
        if (idea.event) throw apiError(HttpStatus.CONFLICT, ApiErrorCode.IdeaAlreadyPlanned, 'Cette idée est déjà au planning');
      }
      const event = await tx.event.create({
        data: {
          tripId,
          authorId: me.id,
          ideaId: input.ideaId ?? null,
          title: input.title,
          category: input.category,
          ...schedule(input),
          ...details(input),
          participants: { create: input.participantIds.map((participantId) => ({ participantId })) },
        },
        include: EVENT_INCLUDE,
      });
      return toTripEvent(event, me);
    });
  }

  async update(actor: Actor, tripId: string, eventId: string, input: UpdateEventInput): Promise<TripEvent> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const event = await this.find(tx, tripId, eventId);
      assertCanEdit(me, event);
      // Writes of a trip are serialised by the lock: comparing here is enough.
      if (input.version !== undefined && input.version !== event.version) {
        throw apiError(
          HttpStatus.CONFLICT,
          ApiErrorCode.EditConflict,
          'Quelqu’un a modifié cet événement entre-temps. Recharge-le avant de le modifier.',
        );
      }
      const merged = {
        startDate: input.startDate ?? toIso(event.startDate),
        endDate: input.endDate !== undefined ? input.endDate : event.endDate && toIso(event.endDate),
        startTime: input.startTime !== undefined ? input.startTime : event.startTime,
        endTime: input.endTime !== undefined ? input.endTime : event.endTime,
      };
      const error = scheduleError(merged);
      if (error) throw validationError(error);
      // Only a change of days is checked: an event left outside after the trip dates moved can still be edited.
      const daysChanged =
        merged.startDate !== toIso(event.startDate) || (merged.endDate ?? null) !== (event.endDate && toIso(event.endDate));
      if (daysChanged) await assertWithinTrip(tx, tripId, merged);
      if (input.participantIds) {
        await assertParticipants(tx, tripId, input.participantIds, event.participants.map((p) => p.participantId));
        await tx.eventParticipant.deleteMany({ where: { eventId: event.id } });
      }
      const updated = await tx.event.update({
        where: { id: event.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.category !== undefined && { category: input.category }),
          ...schedule(merged),
          ...details(input),
          ...(input.participantIds && { participants: { create: input.participantIds.map((participantId) => ({ participantId })) } }),
          version: { increment: 1 },
        },
        include: EVENT_INCLUDE,
      });
      return toTripEvent(updated, me);
    });
  }

  /** Removing a planned idea's event puts the idea back in the box, untouched. */
  async remove(actor: Actor, tripId: string, eventId: string): Promise<void> {
    await this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const event = await this.find(tx, tripId, eventId);
      assertCanEdit(me, event);
      await tx.event.delete({ where: { id: event.id } });
    });
  }

  private async find(db: Prisma.TransactionClient, tripId: string, eventId: string): Promise<EventWithRelations> {
    if (!z.uuid().safeParse(eventId).success) throw eventNotFound();
    const event = await db.event.findFirst({ where: { id: eventId, tripId }, include: EVENT_INCLUDE });
    if (!event) throw eventNotFound();
    return event;
  }
}

/** The schedule as stored: an end date equal to the start is a single day. */
function schedule(input: { startDate: string; endDate?: string | null; startTime?: string | null; endTime?: string | null }) {
  const endDate = input.endDate && input.endDate !== input.startDate ? input.endDate : null;
  const startTime = input.startTime ?? null;
  return {
    startDate: toDate(input.startDate),
    endDate: endDate ? toDate(endDate) : null,
    startTime,
    // No end time without a start time: clearing the start clears both.
    endTime: startTime ? (input.endTime ?? null) : null,
  };
}

/** Optional columns present in the request (undefined = unchanged). */
function details(input: CreateEventInput | UpdateEventInput) {
  return {
    ...(input.place !== undefined && { place: input.place }),
    ...(input.url !== undefined && { url: input.url }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.bookingRef !== undefined && { bookingRef: input.bookingRef }),
  };
}

function validationError(error: { field: string; message: string }) {
  const body: ApiErrorBody = { code: ApiErrorCode.ValidationFailed, message: error.message, fields: { [error.field]: error.message } };
  return new BadRequestException(body);
}

/** When the trip has dates, its events stay within them. */
async function assertWithinTrip(
  tx: Prisma.TransactionClient,
  tripId: string,
  schedule: { startDate: string; endDate?: string | null },
): Promise<void> {
  const trip = await tx.trip.findUniqueOrThrow({ where: { id: tripId }, select: { startDate: true, endDate: true } });
  const error = tripRangeError(
    { startDate: schedule.startDate, endDate: schedule.endDate && schedule.endDate !== schedule.startDate ? schedule.endDate : null },
    { startDate: trip.startDate && toIso(trip.startDate), endDate: trip.endDate && toIso(trip.endDate) },
  );
  if (error) throw validationError(error);
}

/** The people of an event must be current members of its trip, or already on it (someone who left stays listed). */
async function assertParticipants(tx: Prisma.TransactionClient, tripId: string, ids: string[], alreadyOn: string[] = []): Promise<void> {
  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'Un participant est en double');
  }
  const added = ids.filter((id) => !alreadyOn.includes(id));
  if (added.length === 0) return;
  const found = await tx.participant.count({ where: { id: { in: added }, tripId, status: ParticipantStatus.ACTIVE } });
  if (found !== added.length) {
    throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.ValidationFailed, 'Ce participant ne fait plus partie du voyage');
  }
}

function assertCanEdit(me: Participant, event: EventWithRelations): void {
  if (!canEditEvent(me, { authorId: event.authorId, participantIds: event.participants.map((p) => p.participantId) })) {
    throw apiError(
      HttpStatus.FORBIDDEN,
      ApiErrorCode.Forbidden,
      'Seuls son auteur, ses participants et les organisateurs peuvent modifier cet événement',
    );
  }
}

const author = toContentAuthor;

function toTripEvent(event: EventWithRelations, me: Participant): TripEvent {
  const participantIds = event.participants.map((p) => p.participantId);
  return {
    id: event.id,
    title: event.title,
    category: event.category as EventCategory,
    startDate: toIso(event.startDate),
    endDate: event.endDate && toIso(event.endDate),
    startTime: event.startTime,
    endTime: event.endTime,
    place: event.place,
    url: event.url,
    description: event.description,
    bookingRef: event.bookingRef,
    participantIds,
    participants: event.participants.map((p) => author(p.participant)),
    author: author(event.author),
    idea: event.idea && { id: event.idea.id, author: author(event.idea.author) },
    createdAt: event.createdAt.toISOString(),
    version: event.version,
    canEdit: canEditEvent(me, { authorId: event.authorId, participantIds }),
  };
}
