import { findOverlaps, peopleLabel, type TripEvent } from '@7trip/shared';

import { useTrip } from '@/trips/trips-api';

import { useEvents } from './events-api';

type Draft = Pick<TripEvent, 'startDate' | 'endDate' | 'startTime' | 'endTime' | 'participantIds'>;

/**
 * « Léa a déjà « Flamenco » à 19:00. Tu peux quand même enregistrer. » for the event being
 * edited (CDC §7: flagged, never blocking), from the planning already loaded.
 */
export function useOverlapWarning(tripId: string, draft: Draft | null, editingId?: string): string | null {
  const events = useEvents(tripId).data ?? [];
  const participants = useTrip(tripId).data?.participants ?? [];
  if (!draft) return null;

  const candidate = { ...draft, id: editingId ?? 'draft', title: '' };
  const others = events.filter((event) => event.id !== editingId);
  const overlap = findOverlaps([candidate, ...others], participants.map((p) => p.id)).find(
    (pair) => pair.first.id === candidate.id || pair.second.id === candidate.id,
  );
  if (!overlap) return null;

  const other = (overlap.first.id === candidate.id ? overlap.second : overlap.first) as TripEvent;
  const wholeGroup = participants.length > 1 && overlap.participantIds.length === participants.length;
  const people = overlap.participantIds.map((id) => participants.find((p) => p.id === id)).filter((p) => p !== undefined);
  const who = wholeGroup
    ? 'Tout le groupe a'
    : people.length === 1 && people[0]!.isMe
      ? 'Tu as'
      : `${peopleLabel(people.map((p) => (p.isMe ? 'toi' : p.displayName)), false)} ${people.length === 1 ? 'a' : 'ont'}`;
  return `${who} déjà « ${other.title} » à ${other.startTime}. Tu peux quand même enregistrer.`;
}
