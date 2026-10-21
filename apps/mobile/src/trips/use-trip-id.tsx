import { createContext, useContext } from 'react';

const TripIdContext = createContext<string | null>(null);

/**
 * Provided by app/voyage/[id]/_layout, the one place where the `[id]` segment is always known.
 * Screens below (tabs included) must not read it from their own params: switching tabs does not carry it.
 */
export const TripIdProvider = TripIdContext.Provider;

/** Id of the trip in the current /voyage/[id] route. */
export function useTripId(): string {
  const id = useContext(TripIdContext);
  if (!id) throw new Error('useTripId must be used under app/voyage/[id]');
  return id;
}
