import type {
  CreateTripRequest,
  GuestJoinResponse,
  InvitationPreview,
  ParticipantRole,
  TripDetail,
  TripInvitation,
  TripSummary,
  UpdateTripRequest,
} from '@7trip/shared';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';
import { apiRequest } from '@/lib/api';

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
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => tripRequest<TripDetail>(id, `/trips/${id}`),
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
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTripRequest) => tripRequest<TripDetail>(id, `/trips/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (trip) => {
      client.setQueryData(tripKeys.detail(trip.id), trip);
      void client.invalidateQueries({ queryKey: tripKeys.mine });
    },
  });
}

/** Deletes the trip for everyone. Leaving the trip screens is up to the caller (see useConfirmDeleteTrip). */
export function useDeleteTrip(id: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => tripRequest<void>(id, `/trips/${id}`, { method: 'DELETE' }),
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
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: tripKeys.invitation(tripId),
    queryFn: () => tripRequest<TripInvitation>(tripId, `/trips/${tripId}/invitation`),
    enabled,
  });
}

export function useRenewInvitation(tripId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => tripRequest<TripInvitation>(tripId, `/trips/${tripId}/invitation/renew`, { method: 'POST' }),
    onSuccess: (invitation) => client.setQueryData(tripKeys.invitation(tripId), invitation),
  });
}

/** Public: signed out, `alreadyMember` is always false (guest sessions are known locally). */
export function useInvitationPreview(code: string) {
  const { authedRequest, status } = useAuth();
  return useQuery({
    queryKey: [...tripKeys.preview(code), status],
    queryFn: () =>
      status === 'signedIn' ? authedRequest<InvitationPreview>(`/invitations/${code}`) : apiRequest<InvitationPreview>(`/invitations/${code}`),
    enabled: status !== 'loading',
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

/** Joins without an account: keeps the guest session on this device. */
export function useJoinAsGuest(code: string) {
  const { addGuestSession } = useAuth();
  const apply = useApplyTrip();
  return useMutation({
    mutationFn: (displayName: string) =>
      apiRequest<GuestJoinResponse>(`/invitations/${code}/join-guest`, { method: 'POST', body: { displayName } }),
    onSuccess: async ({ token, trip }) => {
      await addGuestSession(trip.id, token);
      apply(trip);
    },
  });
}

/** Trips this device joined as a guest, for the signed-out home screen. */
export function useGuestTrips() {
  const { guestSessions, tripRequest } = useAuth();
  return useQueries({
    queries: Object.keys(guestSessions).map((id) => ({
      queryKey: tripKeys.detail(id),
      queryFn: () => tripRequest<TripDetail>(id, `/trips/${id}`),
    })),
  });
}

export function useUpdateParticipantRole(tripId: string) {
  const { tripRequest } = useAuth();
  const apply = useApplyTrip();
  return useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: ParticipantRole }) =>
      tripRequest<TripDetail>(tripId, `/trips/${tripId}/participants/${participantId}`, { method: 'PATCH', body: { role } }),
    onSuccess: apply,
  });
}

export function useRemoveParticipant(tripId: string) {
  const { tripRequest } = useAuth();
  const apply = useApplyTrip();
  return useMutation({
    mutationFn: (participantId: string) => tripRequest<TripDetail>(tripId, `/trips/${tripId}/participants/${participantId}`, { method: 'DELETE' }),
    onSuccess: apply,
  });
}

/** Leaving the trip screens is up to the caller, like for deletion. */
export function useLeaveTrip(tripId: string) {
  const { tripRequest, removeGuestSession } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => tripRequest<void>(tripId, `/trips/${tripId}/leave`, { method: 'POST' }),
    onSuccess: async () => {
      await removeGuestSession(tripId);
      client.setQueryData<TripSummary[]>(tripKeys.mine, (trips) => trips?.filter((trip) => trip.id !== tripId));
      void client.invalidateQueries({ queryKey: tripKeys.mine });
      // A cached preview of this trip's link would still say "already a member" and hide the join button.
      client.removeQueries({ queryKey: ['invitations'] });
    },
  });
}
