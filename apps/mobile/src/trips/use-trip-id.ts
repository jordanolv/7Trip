import { useLocalSearchParams } from 'expo-router';

/** Id of the trip in the current /voyage/[id] route. */
export function useTripId(): string {
  const { id } = useLocalSearchParams<{ id: string }>();
  return id ?? '';
}
