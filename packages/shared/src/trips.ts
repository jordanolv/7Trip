import { z } from 'zod';

/** Identity colours a trip can use (keys of `tripColors` in @7trip/ui-tokens). */
export const TRIP_COLORS = ['orange', 'forest', 'lagoon', 'raspberry', 'lavender', 'mustard'] as const;
export type TripColorKey = (typeof TRIP_COLORS)[number];

/** Icons a trip can use (drawn by the apps). */
export const TRIP_ICONS = [
  'sun',
  'mountain',
  'plane',
  'palm',
  'tent',
  'city',
  'boat',
  'camera',
  'car',
  'bike',
  'suitcase',
  'food',
] as const;
export type TripIconKey = (typeof TRIP_ICONS)[number];

export const TRIP_KINDS = ['SOLO', 'GROUP'] as const;
export type TripKind = (typeof TRIP_KINDS)[number];

export const PARTICIPANT_ROLES = ['ORGANIZER', 'PARTICIPANT'] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];

/** Calendar date without time or timezone, e.g. "2026-10-17". */
export const isoDateSchema = z.iso.date('Date invalide');

const titleSchema = z.string().trim().min(1, 'Donne un nom à ton voyage').max(60, '60 caractères maximum');
const destinationSchema = z.string().trim().min(1, 'Indique un lieu').max(80, '80 caractères maximum');

export const MAX_DESTINATIONS = 10;
/** Ordered stops, e.g. ["Cracovie", "Varsovie"]. Empty while the destination is undecided. */
const destinationsSchema = z.array(destinationSchema).max(MAX_DESTINATIONS, `${MAX_DESTINATIONS} étapes maximum`);

const datesRefinement = <T extends { startDate?: string | null; endDate?: string | null }>(trip: T) =>
  !trip.startDate || !trip.endDate || trip.endDate >= trip.startDate;
const datesMessage = { message: 'La date de fin doit être après la date de début', path: ['endDate'] };

export const createTripRequestSchema = z
  .object({
    title: titleSchema,
    destinations: destinationsSchema.default([]),
    startDate: isoDateSchema.nullish(),
    endDate: isoDateSchema.nullish(),
    kind: z.enum(TRIP_KINDS).default('GROUP'),
    color: z.enum(TRIP_COLORS).optional(),
    icon: z.enum(TRIP_ICONS).optional(),
  })
  .refine(datesRefinement, datesMessage);
export type CreateTripRequest = z.input<typeof createTripRequestSchema>;

export const updateTripRequestSchema = z
  .object({
    title: titleSchema.optional(),
    destinations: destinationsSchema.optional(),
    startDate: isoDateSchema.nullish(),
    endDate: isoDateSchema.nullish(),
    kind: z.enum(TRIP_KINDS).optional(),
    color: z.enum(TRIP_COLORS).optional(),
    icon: z.enum(TRIP_ICONS).optional(),
  })
  .refine(datesRefinement, datesMessage);
export type UpdateTripRequest = z.input<typeof updateTripRequestSchema>;

export interface TripParticipant {
  id: string;
  displayName: string;
  role: ParticipantRole;
  /** True for the participant row of the signed-in user. */
  isMe: boolean;
}

export interface TripSummary {
  id: string;
  title: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  kind: TripKind;
  color: TripColorKey;
  icon: TripIconKey;
  participantCount: number;
  myRole: ParticipantRole;
}

export interface TripDetail extends TripSummary {
  participants: TripParticipant[];
  createdAt: string;
}

export type TripPhase = 'upcoming' | 'ongoing' | 'past';

/**
 * Lifecycle derived from the dates — no workflow to manage (CDC §4).
 * Without dates a trip is still being planned, hence "upcoming". `today` is an ISO date in the
 * user's own timezone.
 */
export function tripPhase(trip: Pick<TripSummary, 'startDate' | 'endDate'>, today: string): TripPhase {
  const start = trip.startDate;
  const end = trip.endDate ?? trip.startDate;
  if (!start || !end) return 'upcoming';
  if (end < today) return 'past';
  if (start <= today) return 'ongoing';
  return 'upcoming';
}

const PHASE_ORDER: Record<TripPhase | 'undated', number> = { ongoing: 0, upcoming: 1, undated: 2, past: 3 };

/**
 * Order for "Mes voyages": ongoing, then upcoming (soonest first), then undated (input order kept),
 * then past (most recent first). Done client side because the phase depends on the user's `today`.
 */
export function sortTrips<T extends Pick<TripSummary, 'startDate' | 'endDate'>>(trips: readonly T[], today: string): T[] {
  const rank = (trip: T) => PHASE_ORDER[trip.startDate ? tripPhase(trip, today) : 'undated'];
  return trips
    .map((trip, index) => ({ trip, index }))
    .sort((a, b) => {
      const byPhase = rank(a.trip) - rank(b.trip);
      if (byPhase !== 0) return byPhase;
      const [x, y] = [a.trip.startDate ?? '', b.trip.startDate ?? ''];
      if (x !== y) return rank(a.trip) === PHASE_ORDER.past ? (x < y ? 1 : -1) : x < y ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ trip }) => trip);
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Today's date in the device's timezone, as an ISO date. */
export function localIsoDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "Cracovie", "Cracovie → Varsovie", "Cracovie → Varsovie → Gdańsk", "Cracovie → Varsovie + 2 étapes". */
export function formatDestinations(destinations: readonly string[]): string | null {
  if (destinations.length === 0) return null;
  if (destinations.length <= 3) return destinations.join(' → ');
  return `${destinations.slice(0, 2).join(' → ')} + ${destinations.length - 2} étapes`;
}
