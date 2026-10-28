import type { CreatePollRequest, Poll } from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';
import { ideaKeys } from '@/ideas/ideas-api';
import { ApiError, apiRequest } from '@/lib/api';

export const pollKeys = {
  list: (tripId: string) => ['polls', tripId] as const,
  detail: (tripId: string, pollId: string) => ['polls', tripId, pollId] as const,
  link: (pollId: string) => ['poll-link', pollId] as const,
};

export function usePolls(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: pollKeys.list(tripId),
    queryFn: () => tripRequest<Poll[]>(tripId, `/trips/${tripId}/polls`),
  });
}

/** Open polls the caller has not voted on yet: the badge on the Plus tab. */
export function usePollsToVote(tripId: string): number {
  return usePolls(tripId).data?.filter((poll) => !poll.closed && !poll.hasVoted).length ?? 0;
}

/** Opens instantly from the list, then refreshes: others may have voted meanwhile. */
export function usePoll(tripId: string, pollId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: pollKeys.detail(tripId, pollId),
    queryFn: () => tripRequest<Poll>(tripId, `/trips/${tripId}/polls/${pollId}`),
    initialData: () => client.getQueryData<Poll[]>(pollKeys.list(tripId))?.find((poll) => poll.id === pollId),
    initialDataUpdatedAt: () => client.getQueryState(pollKeys.list(tripId))?.dataUpdatedAt,
  });
}

/**
 * The poll behind a shared link, which names no trip: tried as the user, then with each guest
 * session of this device. Null when none of them is in its trip.
 */
export function usePollLink(pollId: string) {
  const { status, authedRequest, guestSessions } = useAuth();
  return useQuery({
    queryKey: [...pollKeys.link(pollId), status, Object.keys(guestSessions)],
    enabled: status !== 'loading',
    queryFn: async () => {
      const attempts: (() => Promise<Poll>)[] = [
        ...(status === 'signedIn' ? [() => authedRequest<Poll>(`/polls/${pollId}`)] : []),
        ...Object.values(guestSessions).map((guestToken) => () => apiRequest<Poll>(`/polls/${pollId}`, { guestToken })),
      ];
      for (const attempt of attempts) {
        try {
          return await attempt();
        } catch (error) {
          if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 401)) throw error;
        }
      }
      return null;
    },
  });
}

/** Puts a poll returned by the API in both caches. */
function useStorePoll(tripId: string) {
  const client = useQueryClient();
  return (poll: Poll) => {
    client.setQueryData(pollKeys.detail(tripId, poll.id), poll);
    const polls = client.getQueryData<Poll[]>(pollKeys.list(tripId));
    if (!polls) return void client.invalidateQueries({ queryKey: pollKeys.list(tripId), exact: true });
    client.setQueryData(
      pollKeys.list(tripId),
      polls.some((p) => p.id === poll.id) ? polls.map((p) => (p.id === poll.id ? poll : p)) : [poll, ...polls],
    );
  };
}

export function useCreatePoll(tripId: string) {
  const { tripRequest } = useAuth();
  const store = useStorePoll(tripId);
  return useMutation({
    mutationFn: (input: CreatePollRequest) => tripRequest<Poll>(tripId, `/trips/${tripId}/polls`, { method: 'POST', body: input }),
    onSuccess: store,
  });
}

/** The caller's whole vote; an empty list withdraws it. */
export function useVote(tripId: string, pollId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const store = useStorePoll(tripId);
  return useMutation({
    mutationFn: (optionIds: string[]) => tripRequest<Poll>(tripId, `/trips/${tripId}/polls/${pollId}/vote`, { method: 'PUT', body: { optionIds } }),
    onSuccess: store,
    // Closed meanwhile: show it as it is now.
    onError: () => void client.invalidateQueries({ queryKey: pollKeys.detail(tripId, pollId) }),
  });
}

export function useClosePoll(tripId: string, pollId: string) {
  const { tripRequest } = useAuth();
  const store = useStorePoll(tripId);
  return useMutation({
    mutationFn: () => tripRequest<Poll>(tripId, `/trips/${tripId}/polls/${pollId}/close`, { method: 'POST' }),
    onSuccess: store,
  });
}

/** Sets the destination or the dates, or keeps an idea: the trip and the idea box change too. */
export function useApplyPoll(tripId: string, pollId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const store = useStorePoll(tripId);
  return useMutation({
    mutationFn: (optionId: string) => tripRequest<Poll>(tripId, `/trips/${tripId}/polls/${pollId}/apply`, { method: 'POST', body: { optionId } }),
    onSuccess: (poll) => {
      store(poll);
      void client.invalidateQueries({ queryKey: ['trips'] });
      void client.invalidateQueries({ queryKey: ideaKeys.list(tripId) });
    },
  });
}

export function useDeletePoll(tripId: string, pollId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => tripRequest<void>(tripId, `/trips/${tripId}/polls/${pollId}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.setQueryData<Poll[]>(pollKeys.list(tripId), (polls) => polls?.filter((poll) => poll.id !== pollId));
      client.removeQueries({ queryKey: pollKeys.detail(tripId, pollId) });
    },
  });
}
