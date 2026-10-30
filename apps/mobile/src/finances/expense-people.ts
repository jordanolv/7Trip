import type { ContentAuthor, Expense, TripDetail } from '@7trip/shared';

/** Who can be on an expense: the trip's members in the order they joined, then anyone already on it who has left. */
export function expensePeople(trip: TripDetail, expense?: Expense): ContentAuthor[] {
  const members = trip.participants.map((p) => ({ id: p.id, displayName: p.displayName, avatarColor: p.avatarColor, hasLeft: false }));
  const onIt = expense ? [expense.payer, ...expense.shares.map((s) => s.participant)] : [];
  const gone = onIt.filter((p, index) => !members.some((m) => m.id === p.id) && onIt.findIndex((o) => o.id === p.id) === index);
  return [...members, ...gone];
}

export const myParticipantId = (trip: TripDetail) => trip.participants.find((p) => p.isMe)!.id;
