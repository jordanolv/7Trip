import type { Participant } from '../generated/prisma/client.js';

/** Who is calling a trip route: a signed-in user, or a guest session (which opens one trip only). */
export type Actor = { kind: 'user'; userId: string } | { kind: 'guest'; participantId: string };

export const userActor = (userId: string): Actor => ({ kind: 'user', userId });

/** Prisma filter for the caller's participant row. */
export const actorWhere = (actor: Actor) => (actor.kind === 'user' ? { userId: actor.userId } : { id: actor.participantId });

export const isActor = (participant: Pick<Participant, 'id' | 'userId'>, actor: Actor) =>
  actor.kind === 'user' ? participant.userId === actor.userId : participant.id === actor.participantId;
