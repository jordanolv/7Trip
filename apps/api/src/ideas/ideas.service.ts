import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  canEditContent,
  type Idea,
  type UnseenIdeas,
  type IdeaCategory,
  type createIdeaRequestSchema,
  type updateIdeaRequestSchema,
} from '@7trip/shared';
import { z } from 'zod';
import { apiError } from '../common/api-error.js';
import type { Participant, Prisma } from '../generated/prisma/client.js';
import { ParticipantStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Actor } from '../trips/actor.js';
import { TripsService } from '../trips/trips.service.js';

/** Validated request bodies (blank fields already turned into null). */
export type CreateIdeaInput = z.output<typeof createIdeaRequestSchema>;
export type UpdateIdeaInput = z.output<typeof updateIdeaRequestSchema>;

const IDEA_INCLUDE = {
  author: true,
  event: { select: { id: true, startDate: true, startTime: true } },
} satisfies Prisma.IdeaInclude;
type IdeaWithAuthor = Prisma.IdeaGetPayload<{ include: typeof IDEA_INCLUDE }>;

const ideaNotFound = () => apiError(HttpStatus.NOT_FOUND, ApiErrorCode.NotFound, 'Idée introuvable');

/**
 * The idea box (CDC §5). Every member, guests included, can propose; only the author and the
 * organizers edit or delete (docs/decisions.md). Writes run under the trip lock, like membership
 * changes, so a demoted organizer cannot edit someone else's idea anymore.
 */
@Injectable()
export class IdeasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  /** Newest first. */
  async list(actor: Actor, tripId: string): Promise<Idea[]> {
    const me = await this.trips.member(actor, tripId);
    const ideas = await this.prisma.idea.findMany({ where: { tripId }, include: IDEA_INCLUDE, orderBy: { createdAt: 'desc' } });
    return ideas.map((idea) => toIdea(idea, me));
  }

  async unseen(actor: Actor, tripId: string): Promise<UnseenIdeas> {
    const me = await this.trips.member(actor, tripId);
    const count = await this.prisma.idea.count({
      where: { tripId, authorId: { not: me.id }, ...(me.ideasSeenAt && { createdAt: { gt: me.ideasSeenAt } }) },
    });
    return { count };
  }

  /** Never moves back, nor past now: a stale or skewed `until` cannot hide newer ideas. */
  async markSeen(actor: Actor, tripId: string, until: Date): Promise<void> {
    const me = await this.trips.member(actor, tripId);
    const seenAt = new Date(Math.min(until.getTime(), Date.now()));
    await this.prisma.participant.updateMany({
      where: { id: me.id, OR: [{ ideasSeenAt: null }, { ideasSeenAt: { lt: seenAt } }] },
      data: { ideasSeenAt: seenAt },
    });
  }

  async get(actor: Actor, tripId: string, ideaId: string): Promise<Idea> {
    const me = await this.trips.member(actor, tripId);
    return toIdea(await this.find(this.prisma, tripId, ideaId), me);
  }

  async create(actor: Actor, tripId: string, input: CreateIdeaInput): Promise<Idea> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const idea = await tx.idea.create({
        data: { tripId, authorId: me.id, title: input.title, ...fields(input) },
        include: IDEA_INCLUDE,
      });
      return toIdea(idea, me);
    });
  }

  async update(actor: Actor, tripId: string, ideaId: string, input: UpdateIdeaInput): Promise<Idea> {
    return this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const idea = await this.find(tx, tripId, ideaId);
      assertCanEdit(me, idea);
      // Writes of a trip are serialised by the lock: comparing here is enough.
      if (input.version !== undefined && input.version !== idea.version) {
        throw apiError(
          HttpStatus.CONFLICT,
          ApiErrorCode.EditConflict,
          'Quelqu’un a modifié cette idée entre-temps. Recharge-la avant de la modifier.',
        );
      }
      const updated = await tx.idea.update({
        where: { id: idea.id },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...fields(input),
          ...(input.status !== undefined && { status: input.status }),
          version: { increment: 1 },
        },
        include: IDEA_INCLUDE,
      });
      return toIdea(updated, me);
    });
  }

  async remove(actor: Actor, tripId: string, ideaId: string): Promise<void> {
    await this.trips.withTripLock(actor, tripId, async (tx, { me }) => {
      const idea = await this.find(tx, tripId, ideaId);
      assertCanEdit(me, idea);
      await tx.idea.delete({ where: { id: idea.id } });
    });
  }

  private async find(db: Prisma.TransactionClient, tripId: string, ideaId: string): Promise<IdeaWithAuthor> {
    if (!z.uuid().safeParse(ideaId).success) throw ideaNotFound();
    const idea = await db.idea.findFirst({ where: { id: ideaId, tripId }, include: IDEA_INCLUDE });
    if (!idea) throw ideaNotFound();
    return idea;
  }
}

/** Optional columns present in the request (undefined = unchanged). */
function fields(input: CreateIdeaInput | UpdateIdeaInput) {
  return {
    ...(input.category !== undefined && { category: input.category }),
    ...(input.place !== undefined && { place: input.place }),
    ...(input.url !== undefined && { url: input.url }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.cost !== undefined && { cost: input.cost }),
  };
}

function assertCanEdit(me: Participant, idea: { authorId: string }): void {
  if (!canEditContent(me, idea.authorId)) {
    throw apiError(HttpStatus.FORBIDDEN, ApiErrorCode.Forbidden, 'Seuls son auteur et les organisateurs peuvent modifier cette idée');
  }
}

function toIdea(idea: IdeaWithAuthor, me: Participant): Idea {
  return {
    id: idea.id,
    title: idea.title,
    category: idea.category as IdeaCategory | null,
    place: idea.place,
    url: idea.url,
    description: idea.description,
    cost: idea.cost,
    status: idea.status,
    author: {
      id: idea.author.id,
      displayName: idea.author.displayName,
      hasLeft: idea.author.status === ParticipantStatus.LEFT,
    },
    createdAt: idea.createdAt.toISOString(),
    version: idea.version,
    canEdit: canEditContent(me, idea.authorId),
    plannedEvent: idea.event && {
      id: idea.event.id,
      startDate: idea.event.startDate.toISOString().slice(0, 10),
      startTime: idea.event.startTime,
    },
  };
}
