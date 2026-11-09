import { z } from 'zod';

// Places picked from Google (docs/decisions.md, "Lieux"). Google's terms let us keep the place id for
// good; its address and position only as a cache refreshed within 30 days, which the API does.

/** A Google place id ("ChIJD7G2bqduEg0ROdrTdOj1Jok"). */
export const placeIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^[A-Za-z0-9_-]+$/, 'Lieu invalide');

/** One search: the same session token from the first letter typed to the place picked (cheaper at Google). */
export const placeSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Tape au moins 2 lettres').max(120),
  session: z.uuid(),
});
export type PlaceSearchQuery = z.input<typeof placeSearchQuerySchema>;

export const placeDetailsQuerySchema = z.object({ session: z.uuid().optional() });

/** A line of the place search. */
export interface PlaceSuggestion {
  placeId: string;
  /** "Plaza de España": what is stored as the item's place once picked. */
  name: string;
  /** "Av. de Isabel la Católica, Séville", to tell places of the same name apart. */
  detail: string | null;
  /** Straight-line distance from the trip's other places, in metres, when it has some. */
  distanceMeters: number | null;
}

/** Where a picked place is. */
export interface PlaceLocation {
  address: string | null;
  lat: number;
  lng: number;
}

/** A place once picked, before the item is saved (its name comes from the suggestion). */
export interface PlaceDetails extends PlaceLocation {
  /** Google may answer with a newer id for the same place. */
  placeId: string;
}

/** "350 m", "2,9 km", "98 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '')} km`;
  return `${Math.round(meters / 1000)} km`;
}

/** Straight-line distance between two points, in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}
