import type { CreateIdeaRequest, Idea, UnseenIdeas, UpdateIdeaRequest } from '@7trip/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/auth/auth-context';

export const ideaKeys = {
  list: (tripId: string) => ['ideas', tripId] as const,
  detail: (tripId: string, ideaId: string) => ['ideas', tripId, ideaId] as const,
  unseen: (tripId: string) => ['ideas', tripId, 'unseen'] as const,
};

export function useIdeas(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: ideaKeys.list(tripId),
    queryFn: () => tripRequest<Idea[]>(tripId, `/trips/${tripId}/ideas`),
  });
}

/** The red badge on the Ideas tab: checked again every minute while the trip is open. */
export function useUnseenIdeas(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: ideaKeys.unseen(tripId),
    queryFn: () => tripRequest<UnseenIdeas>(tripId, `/trips/${tripId}/ideas/unseen`),
    refetchInterval: 60_000,
  });
}

/** Up to the newest idea shown: one proposed meanwhile stays new. Clears the badge right away. */
export function useMarkIdeasSeen(tripId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (until: string) => tripRequest<void>(tripId, `/trips/${tripId}/ideas/seen`, { method: 'POST', body: { until } }),
    onMutate: () => client.setQueryData<UnseenIdeas>(ideaKeys.unseen(tripId), { count: 0 }),
    onSettled: () => void client.invalidateQueries({ queryKey: ideaKeys.unseen(tripId) }),
  });
}

/** Opens instantly from the list, then refreshes. */
export function useIdea(tripId: string, ideaId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: ideaKeys.detail(tripId, ideaId),
    queryFn: () => tripRequest<Idea>(tripId, `/trips/${tripId}/ideas/${ideaId}`),
    initialData: () => client.getQueryData<Idea[]>(ideaKeys.list(tripId))?.find((idea) => idea.id === ideaId),
    initialDataUpdatedAt: () => client.getQueryState(ideaKeys.list(tripId))?.dataUpdatedAt,
  });
}

/** Puts a saved idea in both caches, without waiting for a refetch. */
function useStoreIdea(tripId: string) {
  const client = useQueryClient();
  return (idea: Idea) => {
    client.setQueryData(ideaKeys.detail(tripId, idea.id), idea);
    const ideas = client.getQueryData<Idea[]>(ideaKeys.list(tripId));
    // No list loaded yet (or it failed to load): fetch it rather than leave it stale.
    if (!ideas) return void client.invalidateQueries({ queryKey: ideaKeys.list(tripId), exact: true });
    client.setQueryData(
      ideaKeys.list(tripId),
      ideas.some((i) => i.id === idea.id) ? ideas.map((i) => (i.id === idea.id ? idea : i)) : [idea, ...ideas],
    );
  };
}

export function useCreateIdea(tripId: string) {
  const { tripRequest } = useAuth();
  const store = useStoreIdea(tripId);
  return useMutation({
    mutationFn: (input: CreateIdeaRequest) => tripRequest<Idea>(tripId, `/trips/${tripId}/ideas`, { method: 'POST', body: input }),
    onSuccess: store,
  });
}

/** Sends the version the change was made on: the API refuses it (EDIT_CONFLICT) if someone saved in between. */
export function useUpdateIdea(tripId: string, ideaId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const store = useStoreIdea(tripId);
  return useMutation({
    mutationFn: (input: UpdateIdeaRequest) => tripRequest<Idea>(tripId, `/trips/${tripId}/ideas/${ideaId}`, { method: 'PATCH', body: input }),
    onSuccess: store,
    // A conflict or a deletion elsewhere: show what the server has now.
    onError: () => void client.invalidateQueries({ queryKey: ideaKeys.list(tripId) }),
  });
}

export function useDeleteIdea(tripId: string, ideaId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => tripRequest<void>(tripId, `/trips/${tripId}/ideas/${ideaId}`, { method: 'DELETE' }),
    onSuccess: () => {
      client.setQueryData<Idea[]>(ideaKeys.list(tripId), (ideas) => ideas?.filter((idea) => idea.id !== ideaId));
      client.removeQueries({ queryKey: ideaKeys.detail(tripId, ideaId) });
    },
  });
}
