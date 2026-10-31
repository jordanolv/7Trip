import type { NotificationPrefs } from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';

/** [kind, tripId]: dropped with the rest of the trip's content (forgetTripContent). */
const prefsKey = (tripId: string) => ['notification-prefs', tripId] as const;

/** Accounts only: a guest receives no notifications. */
export function useNotificationPrefs(tripId: string, enabled: boolean) {
  const { authedRequest } = useAuth();
  return useQuery({
    queryKey: prefsKey(tripId),
    queryFn: () => authedRequest<NotificationPrefs>(`/trips/${tripId}/notification-prefs`),
    enabled,
  });
}

export function useSetNotificationPrefs(tripId: string) {
  const { authedRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (change: Partial<NotificationPrefs>) =>
      authedRequest<NotificationPrefs>(`/trips/${tripId}/notification-prefs`, { method: 'PUT', body: change }),
    onSuccess: (prefs) => client.setQueryData(prefsKey(tripId), prefs),
  });
}
