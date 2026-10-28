import { z } from 'zod';

import { optionalText, optionalUrl } from './fields.js';
import { formatDayMonth } from './format.js';
import type { ContentAuthor, IdeaCategory } from './ideas.js';
import { isoDateSchema, type ParticipantRole } from './trips.js';

/** What the planning mixes in one timeline (CDC §7), with the labels the apps show. */
export const EVENT_CATEGORIES = ['ACTIVITY', 'FOOD', 'TRANSPORT', 'LODGING', 'OTHER'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  ACTIVITY: 'Activité',
  FOOD: 'Repas',
  TRANSPORT: 'Transport',
  LODGING: 'Hébergement',
  OTHER: 'Autre',
};

/** Plural, for the planning filters. */
export const EVENT_CATEGORY_FILTER_LABELS: Record<EventCategory, string> = {
  ACTIVITY: 'Activités',
  FOOD: 'Repas',
  TRANSPORT: 'Transports',
  LODGING: 'Hébergements',
  OTHER: 'Autres',
};

/** A planned idea lands in the closest planning category. */
export function eventCategoryForIdea(category: IdeaCategory | null): EventCategory {
  if (category === 'FOOD') return 'FOOD';
  if (category === null || category === 'OTHER') return 'OTHER';
  return 'ACTIVITY';
}

/** "18:00": local time of the trip, no timezone. */
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure invalide');

export const MAX_EVENT_PARTICIPANTS = 50;

/** When an event happens: a date, optionally a range of dates, optionally a start and an end time. */
export interface EventSchedule {
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

/** Why a schedule is impossible, as shown under the field; null when it is fine. */
export function scheduleError(schedule: EventSchedule): { field: 'endDate' | 'endTime'; message: string } | null {
  const { startDate, endDate, startTime, endTime } = schedule;
  if (endDate && endDate < startDate) return { field: 'endDate', message: 'Le dernier jour doit être après le premier' };
  if (endTime && !startTime) return { field: 'endTime', message: 'Indique aussi l’heure de début' };
  const sameDay = !endDate || endDate === startDate;
  if (sameDay && startTime && endTime && endTime <= startTime) {
    return { field: 'endTime', message: 'La fin doit être après le début' };
  }
  return null;
}

/**
 * Why the event falls outside the trip, when its dates are set; null when it fits. A trip
 * without dates takes any day.
 */
export function tripRangeError(
  schedule: Pick<EventSchedule, 'startDate' | 'endDate'>,
  trip: { startDate: string | null; endDate: string | null },
): { field: 'startDate' | 'endDate'; message: string } | null {
  if (!trip.startDate) return null;
  const tripEnd = trip.endDate ?? trip.startDate;
  const last = schedule.endDate ?? schedule.startDate;
  if (schedule.startDate < trip.startDate) {
    return { field: 'startDate', message: `Le voyage commence le ${formatDayMonth(trip.startDate)}` };
  }
  if (last > tripEnd) {
    return { field: schedule.endDate ? 'endDate' : 'startDate', message: `Le voyage se termine le ${formatDayMonth(tripEnd)}` };
  }
  return null;
}

const titleSchema = z.string().trim().min(1, 'Donne un titre à l’événement').max(80, '80 caractères maximum');

const eventFields = {
  category: z.enum(EVENT_CATEGORIES),
  startDate: isoDateSchema,
  /** Last day of a multi-day event (a hotel, a road trip leg). The same day as the start is stored as none. */
  endDate: isoDateSchema.nullish(),
  startTime: timeSchema.nullish(),
  endTime: timeSchema.nullish(),
  place: optionalText(120),
  url: optionalUrl,
  description: optionalText(1000),
  /** Booking reference, e.g. "ALC-48213". */
  bookingRef: optionalText(60),
  /** Who takes part; empty means the whole group. */
  participantIds: z.array(z.uuid()).max(MAX_EVENT_PARTICIPANTS),
};

const withSchedule = <T extends EventSchedule>(event: T, ctx: z.RefinementCtx) => {
  const error = scheduleError(event);
  if (error) ctx.addIssue({ code: 'custom', path: [error.field], message: error.message });
};

export const createEventRequestSchema = z
  .object({
    title: titleSchema,
    ...eventFields,
    category: eventFields.category.default('ACTIVITY'),
    participantIds: eventFields.participantIds.default([]),
    /** The idea being planned: the event keeps a link to it, and removing the event keeps the idea. */
    ideaId: z.uuid().optional(),
  })
  .superRefine(withSchedule);
export type CreateEventRequest = z.input<typeof createEventRequestSchema>;

/** Every field optional: the API checks the schedule once merged with the stored one. */
export const updateEventRequestSchema = z.object({
  title: titleSchema.optional(),
  category: eventFields.category.optional(),
  startDate: eventFields.startDate.optional(),
  endDate: eventFields.endDate,
  startTime: eventFields.startTime,
  endTime: eventFields.endTime,
  place: eventFields.place,
  url: eventFields.url,
  description: eventFields.description,
  bookingRef: eventFields.bookingRef,
  participantIds: eventFields.participantIds.optional(),
  /** The version the change was made on: a newer one on the server means someone else edited it meanwhile (409). */
  version: z.int().positive().optional(),
});
export type UpdateEventRequest = z.input<typeof updateEventRequestSchema>;

/** One event of the planning ("TripEvent": `Event` is taken by the DOM). */
export interface TripEvent {
  id: string;
  title: string;
  category: EventCategory;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  place: string | null;
  url: string | null;
  description: string | null;
  bookingRef: string | null;
  /** Empty: the whole group. */
  participantIds: string[];
  /** The same people, with their names (someone who left stays listed, as "(parti)"). */
  participants: ContentAuthor[];
  author: ContentAuthor;
  /** The idea it was planned from, still in the idea box. */
  idea: { id: string; author: ContentAuthor } | null;
  createdAt: string;
  version: number;
  /** Whether the caller may edit or delete it (canEditEvent). */
  canEdit: boolean;
}

/**
 * Everyone can add to the planning; an event is edited by its author, the organizers and the
 * people taking part in it, which for a whole-group event is everyone (docs/decisions.md).
 */
export function canEditEvent(me: { id: string; role: ParticipantRole }, event: { authorId: string; participantIds: string[] }): boolean {
  return me.role === 'ORGANIZER' || me.id === event.authorId || event.participantIds.length === 0 || event.participantIds.includes(me.id);
}

/** An event without an end time counts as one hour when looking for overlaps. */
const DEFAULT_DURATION_MINUTES = 60;

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (total: number) =>
  `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

export interface Overlap<T = TripEvent> {
  first: T;
  second: T;
  /** Participant ids on both. */
  participantIds: string[];
  from: string;
  to: string;
}

type OverlapCandidate = Pick<TripEvent, 'id' | 'startDate' | 'endDate' | 'startTime' | 'endTime' | 'participantIds'>;

/**
 * Pairs of timed events of the same day sharing at least one person (CDC §7: flagged, never
 * refused). Multi-day and untimed events (a hotel, "dans la journée") are left out: they would
 * overlap everything. `everyone` is the trip's active participants, for whole-group events.
 */
export function findOverlaps<T extends OverlapCandidate>(
  events: T[],
  everyone: string[],
): Overlap<T>[] {
  const timed = events
    .filter((event) => event.startTime && (!event.endDate || event.endDate === event.startDate))
    .map((event) => {
      const start = minutes(event.startTime!);
      const end = event.endTime ? minutes(event.endTime) : start + DEFAULT_DURATION_MINUTES;
      const people = event.participantIds.length ? event.participantIds : everyone;
      return { event, start, end, people };
    })
    .sort((a, b) => a.event.startDate.localeCompare(b.event.startDate) || a.start - b.start);

  const overlaps: Overlap<T>[] = [];
  timed.forEach((a, i) => {
    for (const b of timed.slice(i + 1)) {
      if (b.event.startDate !== a.event.startDate || b.start >= a.end) continue;
      const shared = a.people.filter((id) => b.people.includes(id));
      if (shared.length === 0) continue;
      overlaps.push({ first: a.event, second: b.event, participantIds: shared, from: clock(b.start), to: clock(Math.min(a.end, b.end)) });
    }
  });
  return overlaps;
}

/** "Léa", "Léa et Thomas", "Léa, Thomas et Camille", "Tout le groupe". */
export function peopleLabel(names: string[], wholeGroup: boolean): string {
  if (wholeGroup) return 'Tout le groupe';
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} et ${names.at(-1)}`;
}

/** "Léa est sur les deux entre 19:00 et 19:30." */
export function overlapMessage(names: string[], wholeGroup: boolean, from: string, to: string): string {
  const who = peopleLabel(names, wholeGroup);
  const verb = wholeGroup || names.length === 1 ? 'est' : 'sont';
  return `${who} ${verb} sur les deux entre ${from} et ${to}.`;
}

/** "10:00 – 12:00", "13:30", or null for an untimed event. */
export function formatTimeRange(event: Pick<TripEvent, 'startTime' | 'endTime'>): string | null {
  if (!event.startTime) return null;
  return event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime;
}

/** Whether the event takes place on `day` (multi-day events cover each of their days). */
export const eventOnDay = (event: Pick<TripEvent, 'startDate' | 'endDate'>, day: string) =>
  event.startDate <= day && day <= (event.endDate ?? event.startDate);

/** Timeline order within a day: untimed first, then by start time, then by title. */
export function compareEvents(a: Pick<TripEvent, 'startDate' | 'startTime' | 'title'>, b: Pick<TripEvent, 'startDate' | 'startTime' | 'title'>) {
  return (
    a.startDate.localeCompare(b.startDate) ||
    (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
    a.title.localeCompare(b.title, 'fr')
  );
}

/** `iso` moved by `days` (calendar arithmetic, no timezone). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Longest stretch of trip days the day strip lists; event days outside it are still added. */
const MAX_TRIP_DAYS = 62;

/**
 * Days the planning offers: every day of the trip when its dates are set, plus any day holding
 * an event (planned before the dates moved, say). Sorted.
 */
export function planningDays(
  trip: { startDate: string | null; endDate: string | null },
  events: Pick<TripEvent, 'startDate' | 'endDate'>[],
): string[] {
  const days = new Set<string>();
  if (trip.startDate) {
    const end = trip.endDate ?? trip.startDate;
    for (let day = trip.startDate, n = 0; day <= end && n < MAX_TRIP_DAYS; day = addDays(day, 1), n++) days.add(day);
  }
  for (const event of events) {
    const end = event.endDate ?? event.startDate;
    for (let day = event.startDate, n = 0; day <= end && n < MAX_TRIP_DAYS; day = addDays(day, 1), n++) days.add(day);
  }
  return [...days].sort();
}

const WEEKDAYS_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** "lun", for the day strip. */
export const weekdayShort = (iso: string) => WEEKDAYS_SHORT[new Date(`${iso}T12:00:00Z`).getUTCDay()]!;
/** "lundi". */
export const weekday = (iso: string) => WEEKDAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()]!;
