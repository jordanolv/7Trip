import type { CreateFileDocumentRequest, CreateLinkDocumentRequest, DocumentFileUrl, TripDocument, UpdateDocumentRequest } from '@7trip/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';

import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/lib/api';

export const documentKeys = {
  list: (tripId: string) => ['documents', tripId] as const,
  detail: (tripId: string, documentId: string) => ['documents', tripId, documentId] as const,
};

/** A file picked on the device, as fetch sends it in a multipart body. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

const GONE_MESSAGE = 'Ce document n’est plus disponible : il a été supprimé ou rendu privé.';

/** Out of the list at once, without waiting for it to be fetched again. */
function forget(client: QueryClient, tripId: string, documentId: string) {
  client.setQueryData<TripDocument[]>(documentKeys.list(tripId), (docs) => docs?.filter((doc) => doc.id !== documentId));
}

export function useDocuments(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: documentKeys.list(tripId),
    queryFn: () => tripRequest<TripDocument[]>(tripId, `/trips/${tripId}/documents`),
  });
}

/** Opens instantly from the list, then refreshes. */
export function useDocument(tripId: string, documentId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: documentKeys.detail(tripId, documentId),
    queryFn: async () => {
      try {
        return await tripRequest<TripDocument>(tripId, `/trips/${tripId}/documents/${documentId}`);
      } catch (error) {
        // Deleted, or made private since: the list must not keep showing it either.
        if (error instanceof ApiError && error.status === 404) forget(client, tripId, documentId);
        throw error;
      }
    },
    initialData: () => client.getQueryData<TripDocument[]>(documentKeys.list(tripId))?.find((doc) => doc.id === documentId),
    initialDataUpdatedAt: () => client.getQueryState(documentKeys.list(tripId))?.dataUpdatedAt,
  });
}

function useRefreshDocuments(tripId: string) {
  const client = useQueryClient();
  return (doc?: TripDocument) => {
    if (doc) client.setQueryData(documentKeys.detail(tripId, doc.id), doc);
    void client.invalidateQueries({ queryKey: documentKeys.list(tripId), exact: true });
  };
}

/** A file, or a link: the one form adds both. */
export function useAddDocument(tripId: string) {
  const { tripRequest } = useAuth();
  const refresh = useRefreshDocuments(tripId);
  return useMutation({
    mutationFn: (input: { file: PickedFile; meta: CreateFileDocumentRequest } | { link: CreateLinkDocumentRequest }) => {
      if ('link' in input) return tripRequest<TripDocument>(tripId, `/trips/${tripId}/documents/links`, { method: 'POST', body: input.link });
      const body = new FormData();
      body.append('meta', JSON.stringify(input.meta));
      // React Native's FormData takes a file as { uri, name, type }.
      body.append('file', { uri: input.file.uri, name: input.file.name, type: input.file.mimeType } as unknown as Blob);
      return tripRequest<TripDocument>(tripId, `/trips/${tripId}/documents`, { method: 'POST', body });
    },
    onSuccess: refresh,
  });
}

export function useUpdateDocument(tripId: string, documentId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const refresh = useRefreshDocuments(tripId);
  return useMutation({
    mutationFn: (body: UpdateDocumentRequest) => tripRequest<TripDocument>(tripId, `/trips/${tripId}/documents/${documentId}`, { method: 'PATCH', body }),
    onSuccess: refresh,
    // Changed or removed elsewhere meanwhile: show what the server has now.
    onError: () => {
      void client.invalidateQueries({ queryKey: documentKeys.detail(tripId, documentId) });
      refresh();
    },
  });
}

export function useDeleteDocument(tripId: string, documentId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const refresh = useRefreshDocuments(tripId);
  return useMutation({
    mutationFn: () => tripRequest<void>(tripId, `/trips/${tripId}/documents/${documentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      forget(client, tripId, documentId);
      client.removeQueries({ queryKey: documentKeys.detail(tripId, documentId) });
      refresh();
    },
  });
}

/**
 * Asked for at that moment, so access is checked again: a file through a short-lived link, a link
 * as it is now (it may have been made private since the list was loaded).
 */
export function useOpenDocument(tripId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (doc: TripDocument) => {
      const path = `/trips/${tripId}/documents/${doc.id}`;
      let url: string;
      try {
        url = doc.kind === 'LINK' ? (await tripRequest<TripDocument>(tripId, path)).url! : (await tripRequest<DocumentFileUrl>(tripId, `${path}/url`)).url;
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
        forget(client, tripId, doc.id);
        client.removeQueries({ queryKey: documentKeys.detail(tripId, doc.id) });
        throw new ApiError(404, error.code, GONE_MESSAGE);
      }
      await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
    },
  });
}
