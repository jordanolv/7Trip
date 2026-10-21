import type { CreateTripRequest, TripDetail, TripSummary, UpdateTripRequest } from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';

export const tripKeys = {
  mine: ['trips', 'mine'] as const,
  detail: (id: string) => ['trips', 'detail', id] as const,
};

export function useMyTrips() {
  const { authedRequest, status } = useAuth();
  return useQuery({
    queryKey: tripKeys.mine,
    queryFn: () => authedRequest<TripSummary[]>('/me/trips'),
    enabled: status === 'signedIn',
  });
}

export function useTrip(id: string) {
  const { authedRequest } = useAuth();
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => authedRequest<TripDetail>(`/trips/${id}`),
  });
}

export function useCreateTrip() {
  const { authedRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripRequest) => authedRequest<TripDetail>('/trips', { method: 'POST', body: input }),
    onSuccess: (trip) => {
      client.setQueryData(tripKeys.detail(trip.id), trip);
      void client.invalidateQueries({ queryKey: tripKeys.mine });
    },
  });
}

export function useUpdateTrip(id: string) {
  const { authedRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTripRequest) => authedRequest<TripDetail>(`/trips/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (trip) => {
      client.setQueryData(tripKeys.detail(trip.id), trip);
      void client.invalidateQueries({ queryKey: tripKeys.mine });
    },
  });
}
