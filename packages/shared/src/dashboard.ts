import { compareEvents, eventOnDay, type TripEvent } from './events.js';

type DashboardEvent = Pick<TripEvent, 'startDate' | 'endDate' | 'startTime' | 'endTime' | 'title'>;

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** The day's planning, in timeline order (CDC §3.2: "planning du jour pendant le séjour"). */
export function eventsOfDay<T extends DashboardEvent>(events: T[], day: string): T[] {
  return events.filter((event) => eventOnDay(event, day)).sort(compareEvents);
}

/**
 * Happening now ("MAINTENANT" in the mockup): started, not over. Without an end time an event
 * counts for an hour; untimed ones never are "now".
 */
export function isHappening(event: DashboardEvent, day: string, now: string): boolean {
  if (!event.startTime || event.startDate !== day || (event.endDate && event.endDate !== day)) return false;
  const start = minutes(event.startTime);
  const end = event.endTime ? minutes(event.endTime) : start + 60;
  return minutes(now) >= start && minutes(now) < end;
}

/** What comes next, from now on: later today, then the following days. */
export function nextEvents<T extends DashboardEvent>(events: T[], day: string, now: string, count: number): T[] {
  return events
    .filter((event) => {
      if ((event.endDate ?? event.startDate) < day) return false;
      if (event.startDate > day) return true;
      // Today (or a stay going on): only what has not started yet, untimed things of the day included.
      return event.startDate === day && (!event.startTime || minutes(event.startTime) >= minutes(now));
    })
    .sort(compareEvents)
    .slice(0, count);
}

/** "09:05", local time. */
export const localTime = (date = new Date()) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
