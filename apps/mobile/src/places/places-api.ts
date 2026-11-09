import type { PlaceDetails, PlaceSuggestion } from '@7trip/shared';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';

/** A search session: Google bills the searches of one session with the lookup that ends it. */
export function newPlaceSession(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Suggestions for what is typed (from 2 letters), kept a while so going back and forth costs nothing. */
export function usePlaceSearch(tripId: string, query: string, session: string, enabled: boolean) {
  const { tripRequest } = useAuth();
  const q = query.trim();
  return useQuery({
    queryKey: ['places', tripId, q.toLowerCase()],
    queryFn: () =>
      tripRequest<PlaceSuggestion[]>(tripId, `/trips/${tripId}/places?q=${encodeURIComponent(q)}&session=${session}`),
    enabled: enabled && q.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

export function useLookupPlace(tripId: string) {
  const { tripRequest } = useAuth();
  return (placeId: string, session: string) =>
    tripRequest<PlaceDetails>(tripId, `/trips/${tripId}/places/${encodeURIComponent(placeId)}?session=${session}`);
}
