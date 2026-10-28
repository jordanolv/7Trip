import type { CreateEventRequest, TripEvent, UpdateEventRequest } from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';
import { ideaKeys } from '@/ideas/ideas-api';

export const eventKeys = {
  list: (tripId: string) => ['events', tripId] as const,
  detail: (tripId: string, eventId: string) => ['events', tripId, eventId] as const,
};

export function useEvents(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: eventKeys.list(tripId),
    queryFn: () => tripRequest<TripEvent[]>(tripId, `/trips/${tripId}/events`),
  });
}

/** Opens instantly from the planning, then refreshes. */
export function useEvent(tripId: string, eventId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: eventKeys.detail(tripId, eventId),
    queryFn: () => tripRequest<TripEvent>(tripId, `/trips/${tripId}/events/${eventId}`),
    initialData: () => client.getQueryData<TripEvent[]>(eventKeys.list(tripId))?.find((event) => event.id === eventId),
    initialDataUpdatedAt: () => client.getQueryState(eventKeys.list(tripId))?.dataUpdatedAt,
  });
}

/**
 * After a change: the saved event goes in its cache, and the planning (kept in timeline order by
 * the API) and the idea box (an idea's "Planifiée") are fetched again.
 */
function useRefreshPlanning(tripId: string) {
  const client = useQueryClient();
  return (event?: TripEvent) => {
    if (event) client.setQueryData(eventKeys.detail(tripId, event.id), event);
    void client.invalidateQueries({ queryKey: eventKeys.list(tripId), exact: true });
    void client.invalidateQueries({ queryKey: ideaKeys.list(tripId) });
  };
}

export function useCreateEvent(tripId: string) {
  const { tripRequest } = useAuth();
  const refresh = useRefreshPlanning(tripId);
  return useMutation({
    mutationFn: (input: CreateEventRequest) => tripRequest<TripEvent>(tripId, `/trips/${tripId}/events`, { method: 'POST', body: input }),
    onSuccess: refresh,
  });
}

/** Sends the version the change was made on: the API refuses it (EDIT_CONFLICT) if someone saved in between. */
export function useUpdateEvent(tripId: string, eventId: string) {
  const { tripRequest } = useAuth();
  const refresh = useRefreshPlanning(tripId);
  return useMutation({
    mutationFn: (input: UpdateEventRequest) =>
      tripRequest<TripEvent>(tripId, `/trips/${tripId}/events/${eventId}`, { method: 'PATCH', body: input }),
    onSuccess: refresh,
    // A conflict or a deletion elsewhere: show what the server has now.
    onError: () => refresh(),
  });
}

/** For a planned idea, this is "Retirer du planning": the idea stays in the box. */
export function useDeleteEvent(tripId: string, eventId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const refresh = useRefreshPlanning(tripId);
  return useMutation({
    mutationFn: () => tripRequest<void>(tripId, `/trips/${tripId}/events/${eventId}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.setQueryData<TripEvent[]>(eventKeys.list(tripId), (events) => events?.filter((event) => event.id !== eventId));
      client.removeQueries({ queryKey: eventKeys.detail(tripId, eventId) });
      refresh();
    },
  });
}
