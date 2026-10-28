import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  IDEA_POLL_KINDS,
  canEditContent,
  isPollClosed,
  pollFollowUp,
  pollResultsVisible,
  type ApiErrorBody,
  type ContentAuthor,
  type Poll,
  type PollKind,
  type createPollRequestSchema,
} from '@7trip/shared';
import { z } from 'zod';
import { apiError } from '../common/api-error.js';
import type { Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantRole, ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../trips/actor.js';
import { TripsService } from '../trips/trips.service.js';

/** Validated request body. */
export type CreatePollInput = z.output<typeof createPollRequestSchema>;

const POLL_INCLUDE = {
  author: true,
  closedBy: true,
  options: { orderBy: { position: 'asc' }, include: { votes: { include: { participant: true }, orderBy: { createdAt: 'asc' } } } },
} satisfies Prisma.PollInclude;
type PollWithRelations = Prisma.PollGetPayload<{ include: typeof POLL_INCLUDE }>;

const pollNotFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Sondage introuvable');
const pollClosed = () => apiError(HttpStatus.CONFLICT, ApiErrorCode.PollClosed, 'Ce sondage est clos : les votes ne changent plus.');

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/**
 * Polls (CDC §6). Every member, guests included, creates polls and votes; votes change freely
 * while the poll is open. Only organizers close it or apply an option: nothing is decided
 * automatically. Writes run under the trip lock, so a vote never lands on a poll closed meanwhile.
 */
@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  /** Newest first; the apps put the open ones first. */
  async list(actor: Actor, tripId: string): Promise<Poll[]> {
    const me = await this.trips.member(actor, tripId);
    const [polls, active] = await Promise.all([
      this.prisma.poll.findMany({ where: { tripId }, include: POLL_INCLUDE, orderBy: { createdAt: 'desc' } }),
      this.activeParticipants(this.prisma, tripId),
    ]);
    return polls.map((poll) => toPoll(poll, me, active));
  }

  async get(actor: Actor, tripId: string, pollId: string): Promise<Poll> {
    const me = await this.trips.member(actor, tripId);
    return this.load(this.prisma, tripId, pollId, me);
  }

  /** A shared link (7trip.fr/s/<pollId>) only names the poll: it opens for members of its trip, 404 otherwise. */
  async getByLink(actor: Actor, pollId: string): Promise<Poll> {
    if (!z.uuid().safeParse(pollId).success) throw pollNotFound();
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId }, select: { tripId: true } });
    if (!poll) throw pollNotFound();
    const me = await this.trips.member(actor, poll.tripId).catch(() => {
      throw pollNotFound();
    });
    return this.load(this.prisma, poll.tripId, pollId, me);
  }

  async create(actor: Actor, tripId: string, input: CreatePollInput): Promise<Poll> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      if (input.closesAt && Date.parse(input.closesAt) <= Date.now()) {
        throw validationError('closesAt', 'La date limite est déjà passée');
      }
      const withIdeas = IDEA_POLL_KINDS.includes(input.kind);
      const ideaIds = withIdeas ? input.options.flatMap((o) => (o.ideaId ? [o.ideaId] : [])) : [];
      if (ideaIds.length) {
        const found = await tx.idea.count({ where: { tripId, id: { in: ideaIds } } });
        if (found !== new Set(ideaIds).size) throw apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Idée introuvable');
      }
      const poll = await tx.poll.create({
        data: {
          tripId,
          authorId: me.id,
          kind: input.kind,
          question: input.question,
          multiple: input.multiple,
          closesAt: input.closesAt ? new Date(input.closesAt) : null,
          options: {
            create: input.options.map((o, position) => ({
              label: o.label,
              position,
              // Only what the kind uses: dates for DATES, ideas for the idea kinds.
              ...(input.kind === 'DATES' && o.startDate && { startDate: toDate(o.startDate), endDate: toDate(o.endDate ?? o.startDate) }),
              ...(withIdeas && o.ideaId && { ideaId: o.ideaId }),
            })),
          },
        },
        include: POLL_INCLUDE,
      });
      return toPoll(poll, me, await this.activeParticipants(tx, tripId));
    });
  }

  /** Replaces the caller's vote with `optionIds` (empty: withdraws it). */
  async vote(actor: Actor, tripId: string, pollId: string, optionIds: string[]): Promise<Poll> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const poll = await this.find(tx, tripId, pollId);
      if (isPollClosed(poll)) throw pollClosed();
      const chosen = [...new Set(optionIds)];
      if (!chosen.every((id) => poll.options.some((o) => o.id === id))) throw validationError('optionIds', 'Option inconnue');
      if (!poll.multiple && chosen.length > 1) throw validationError('optionIds', 'Un seul choix possible pour ce sondage');

      await tx.vote.deleteMany({ where: { participantId: me.id, option: { pollId: poll.id } } });
      await tx.vote.createMany({ data: chosen.map((optionId) => ({ optionId, participantId: me.id })) });
      return this.load(tx, tripId, pollId, me);
    });
  }

  async close(actor: Actor, tripId: string, pollId: string): Promise<Poll> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      assertOrganizer(me, 'Seuls les organisateurs peuvent clore un sondage');
      const poll = await this.find(tx, tripId, pollId);
      if (!isPollClosed(poll)) await tx.poll.update({ where: { id: poll.id }, data: { closedAt: new Date(), closedById: me.id } });
      return this.load(tx, tripId, pollId, me);
    });
  }

  /**
   * The follow-up an organizer confirms on a closed poll (CDC §6): set the trip's destination or
   * dates, or keep the idea behind the option. Any option may be applied: on a tie, they choose.
   */
  async apply(actor: Actor, tripId: string, pollId: string, optionId: string): Promise<Poll> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      assertOrganizer(me, 'Seuls les organisateurs peuvent appliquer le résultat d’un sondage');
      const poll = await this.find(tx, tripId, pollId);
      if (!isPollClosed(poll)) throw apiError(HttpStatus.CONFLICT, ApiErrorCode.ValidationFailed, 'Clos le sondage avant d’appliquer son résultat');
      const option = poll.options.find((o) => o.id === optionId);
      if (!option) throw validationError('optionId', 'Option inconnue');

      switch (pollFollowUp(poll.kind as PollKind, { startDate: toIso(option.startDate), ideaId: option.ideaId })) {
        case 'destination':
          await tx.trip.update({ where: { id: tripId }, data: { destinations: { deleteMany: {}, create: [{ name: option.label, position: 0 }] } } });
          break;
        case 'dates':
          await tx.trip.update({ where: { id: tripId }, data: { startDate: option.startDate, endDate: option.endDate ?? option.startDate } });
          break;
        case 'keepIdea':
          await tx.idea.updateMany({ where: { id: option.ideaId!, tripId }, data: { status: 'KEPT', version: { increment: 1 } } });
          break;
        case null:
          throw validationError('optionId', 'Ce sondage n’a pas de suite à appliquer');
      }
      await tx.poll.update({ where: { id: poll.id }, data: { appliedOptionId: option.id } });
      return this.load(tx, tripId, pollId, me);
    });
  }

  /** Its author or an organizer; the votes go with it. */
  async remove(actor: Actor, tripId: string, pollId: string): Promise<void> {
    await this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const poll = await this.find(tx, tripId, pollId);
      if (!canEditContent(me, poll.authorId)) {
        throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, 'Seuls son auteur et les organisateurs peuvent supprimer ce sondage');
      }
      await tx.poll.delete({ where: { id: poll.id } });
    });
  }

  private async load(db: Prisma.TransactionClient, tripId: string, pollId: string, me: Participant): Promise<Poll> {
    // One after the other: inside a transaction, both run on the same connection.
    const poll = await this.find(db, tripId, pollId);
    return toPoll(poll, me, await this.activeParticipants(db, tripId));
  }

  private async find(db: Prisma.TransactionClient, tripId: string, pollId: string): Promise<PollWithRelations> {
    if (!z.uuid().safeParse(pollId).success) throw pollNotFound();
    const poll = await db.poll.findFirst({ where: { id: pollId, tripId }, include: POLL_INCLUDE });
    if (!poll) throw pollNotFound();
    return poll;
  }

  private activeParticipants(db: Prisma.TransactionClient, tripId: string): Promise<Participant[]> {
    return db.participant.findMany({ where: { tripId, status: ParticipantStatus.ACTIVE }, orderBy: { joinedAt: 'asc' } });
  }
}

function assertOrganizer(me: Participant, message: string): void {
  if (me.role !== ParticipantRole.ORGANIZER) throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, message);
}

function validationError(field: string, message: string) {
  const body: ApiErrorBody = { code: ApiErrorCode.ValidationFailed, message, fields: { [field]: message } };
  return new BadRequestException(body);
}

const toAuthor = (p: Participant): ContentAuthor => ({ id: p.id, displayName: p.displayName, hasLeft: p.status === ParticipantStatus.LEFT });

function toPoll(poll: PollWithRelations, me: Participant, active: Participant[]): Poll {
  const closed = isPollClosed(poll);
  const voterIds = new Set(poll.options.flatMap((o) => o.votes.map((v) => v.participantId)));
  const hasVoted = voterIds.has(me.id);
  const resultsVisible = pollResultsVisible({ closed, hasVoted });
  return {
    id: poll.id,
    tripId: poll.tripId,
    kind: poll.kind as PollKind,
    question: poll.question,
    multiple: poll.multiple,
    closesAt: poll.closesAt?.toISOString() ?? null,
    closed,
    // Closed at the deadline: that is when it closed.
    closedAt: (poll.closedAt ?? (closed ? poll.closesAt : null))?.toISOString() ?? null,
    closedBy: poll.closedBy && toAuthor(poll.closedBy),
    author: toAuthor(poll.author),
    createdAt: poll.createdAt.toISOString(),
    options: poll.options.map((o) => ({
      id: o.id,
      label: o.label,
      startDate: toIso(o.startDate),
      endDate: toIso(o.endDate),
      ideaId: o.ideaId,
      votes: resultsVisible ? o.votes.length : null,
      voters: resultsVisible ? o.votes.map((v) => toAuthor(v.participant)) : null,
      mine: o.votes.some((v) => v.participantId === me.id),
    })),
    // Participation counts the people still in the trip; votes of those who left stay in the results.
    voterCount: active.filter((p) => voterIds.has(p.id)).length,
    eligibleCount: active.length,
    waiting: active.filter((p) => !voterIds.has(p.id)).map(toAuthor),
    hasVoted,
    resultsVisible,
    appliedOptionId: poll.appliedOptionId,
    canClose: me.role === ParticipantRole.ORGANIZER && !closed,
    canDelete: canEditContent(me, poll.authorId),
  };
}
