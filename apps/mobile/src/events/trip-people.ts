import type { ContentAuthor, TripDetail, TripEvent } from '@7trip/shared';

/** Who can be put on an event: the trip's members, then anyone already on it who has left since. */
export function tripPeople(trip: TripDetail | undefined, event?: TripEvent): ContentAuthor[] {
  const members = (trip?.participants ?? []).map((p) => ({ id: p.id, displayName: p.displayName, hasLeft: false }));
  const gone = (event?.participants ?? []).filter((p) => !members.some((m) => m.id === p.id));
  return [...members, ...gone];
}
