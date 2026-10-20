import { daysBetween, tripPhase, type TripSummary } from '@7trip/shared';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function parts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return { year, month: month - 1, day };
}

/** "17 oct. 2026" */
export function formatDate(iso: string): string {
  const { year, month, day } = parts(iso);
  return `${day} ${MONTHS_SHORT[month]} ${year}`;
}

/** "17 – 24 octobre", "28 oct. – 3 nov.", "3 – 9 juillet 2025" (year only when not the current one). */
export function formatDateRange(start: string | null, end: string | null, today: string): string | null {
  if (!start) return null;
  const s = parts(start);
  const e = parts(end ?? start);
  const currentYear = parts(today).year;
  const year = e.year !== currentYear ? ` ${e.year}` : '';

  if (start === (end ?? start)) return `${s.day} ${MONTHS[s.month]}${year}`;
  if (s.year === e.year && s.month === e.month) return `${s.day} – ${e.day} ${MONTHS[e.month]}${year}`;
  if (s.year === e.year) return `${s.day} ${MONTHS_SHORT[s.month]} – ${e.day} ${MONTHS_SHORT[e.month]}${year}`;
  return `${s.day} ${MONTHS_SHORT[s.month]} ${s.year} – ${e.day} ${MONTHS_SHORT[e.month]} ${e.year}`;
}

export function participantsLabel(count: number): string {
  return count > 1 ? `${count} participants` : 'Solo pour l’instant';
}

/** Short status shown on a trip card: "En cours · J4", "Dans 25 jours", "Dates à décider"… */
export function tripBadge(trip: Pick<TripSummary, 'startDate' | 'endDate'>, today: string): string {
  if (!trip.startDate) return 'Dates à décider';
  const phase = tripPhase(trip, today);
  if (phase === 'past') return 'Terminé';
  if (phase === 'ongoing') return `En cours · J${daysBetween(trip.startDate, today) + 1}`;
  const days = daysBetween(today, trip.startDate);
  return days === 1 ? 'Demain' : `Dans ${days} jours`;
}
