import { daysBetween, tripPhase, type TripSummary } from './trips.js';

const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

export interface PortfolioTrip<T> {
  trip: T;
  /** Days of the trip, first and last included. */
  days: number;
}

export interface Portfolio<T> {
  /** Most recent first. */
  trips: PortfolioTrip<T>[];
  /** Distinct destinations, in order of first visit; "Lisbonne" and "lisbonne" are one. */
  destinations: string[];
  days: number;
}

/**
 * The personal portfolio (CDC §11, docs/decisions.md): only trips whose end date is past. A trip
 * without dates, or still going on, is not "visited" yet; its destinations are the trip's own.
 */
export function portfolioOf<T extends Pick<TripSummary, 'startDate' | 'endDate' | 'destinations'>>(trips: readonly T[], today: string): Portfolio<T> {
  const done = trips
    .filter((trip) => trip.startDate && tripPhase(trip, today) === 'past')
    .map((trip) => ({ trip, days: daysBetween(trip.startDate!, trip.endDate ?? trip.startDate!) + 1 }))
    .sort((a, b) => ((a.trip.endDate ?? a.trip.startDate!) < (b.trip.endDate ?? b.trip.startDate!) ? 1 : -1));

  const seen = new Map<string, string>();
  for (const { trip } of [...done].reverse()) {
    for (const name of trip.destinations) {
      const key = name.trim().toLocaleLowerCase('fr');
      if (key && !seen.has(key)) seen.set(key, name.trim());
    }
  }
  return { trips: done, destinations: [...seen.values()], days: done.reduce((sum, t) => sum + t.days, 0) };
}

/** "Juil. 2026 · 7 jours" */
export function portfolioTripLabel(startDate: string, days: number): string {
  const [year, month] = startDate.split('-').map(Number) as [number, number];
  return `${MONTHS_SHORT[month - 1]} ${year} · ${days} jour${days > 1 ? 's' : ''}`;
}
