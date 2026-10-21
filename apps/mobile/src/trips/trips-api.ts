import type {
  CreateTripRequest,
  InvitationPreview,
  ParticipantRole,
  TripDetail,
  TripInvitation,
  TripSummary,
  UpdateTripRequest,
} from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';

export const tripKeys = {
  mine: ['trips', 'mine'] as const,
  detail: (id: string) => ['trips', 'detail', id] as const,
  invitation: (id: string) => ['trips', 'invitation', id] as const,
  preview: (code: string) => ['invitations', code] as const,
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

/** Deletes the trip for everyone. Leaving the trip screens is up to the caller (see useConfirmDeleteTrip). */
export function useDeleteTrip(id: string) {
  const { authedRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => authedRequest<void>(`/trips/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.setQueryData<TripSummary[]>(tripKeys.mine, (trips) => trips?.filter((trip) => trip.id !== id));
      void client.invalidateQueries({ queryKey: tripKeys.mine });
    },
  });
}

/** Stores a trip returned by a mutation and refreshes the list (counts, roles). */
function useApplyTrip() {
  const client = useQueryClient();
  return (trip: TripDetail) => {
    client.setQueryData(tripKeys.detail(trip.id), trip);
    void client.invalidateQueries({ queryKey: tripKeys.mine });
  };
}

export function useInvitation(tripId: string, enabled: boolean) {
  const { authedRequest } = useAuth();
  return useQuery({
    queryKey: tripKeys.invitation(tripId),
    queryFn: () => authedRequest<TripInvitation>(`/trips/${tripId}/invitation`),
    enabled,
  });
}

export function useRenewInvitation(tripId: string) {
  const { authedRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => authedRequest<TripInvitation>(`/trips/${tripId}/invitation/renew`, { method: 'POST' }),
    onSuccess: (invitation) => client.setQueryData(tripKeys.invitation(tripId), invitation),
  });
}

export function useInvitationPreview(code: string) {
  const { authedRequest, status } = useAuth();
  return useQuery({
    queryKey: tripKeys.preview(code),
    queryFn: () => authedRequest<InvitationPreview>(`/invitations/${code}`),
    enabled: status === 'signedIn',
    retry: false,
  });
}

export function useJoinTrip(code: string) {
  const { authedRequest } = useAuth();
  const apply = useApplyTrip();
  return useMutation({
    mutationFn: () => authedRequest<TripDetail>(`/invitations/${code}/join`, { method: 'POST' }),
    onSuccess: apply,
  });
}

export function useUpdateParticipantRole(tripId: string) {
  const { authedRequest } = useAuth();
  const apply = useApplyTrip();
  return useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: ParticipantRole }) =>
      authedRequest<TripDetail>(`/trips/${tripId}/participants/${participantId}`, { method: 'PATCH', body: { role } }),
    onSuccess: apply,
  });
}

export function useRemoveParticipant(tripId: string) {
  const { authedRequest } = useAuth();
  const apply = useApplyTrip();
  return useMutation({
    mutationFn: (participantId: string) => authedRequest<TripDetail>(`/trips/${tripId}/participants/${participantId}`, { method: 'DELETE' }),
    onSuccess: apply,
  });
}

/** Leaving the trip screens is up to the caller, like for deletion. */
export function useLeaveTrip(tripId: string) {
  const { authedRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => authedRequest<void>(`/trips/${tripId}/leave`, { method: 'POST' }),
    onSuccess: () => {
      client.setQueryData<TripSummary[]>(tripKeys.mine, (trips) => trips?.filter((trip) => trip.id !== tripId));
      void client.invalidateQueries({ queryKey: tripKeys.mine });
    },
  });
}
