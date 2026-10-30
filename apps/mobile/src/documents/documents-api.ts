import type {
  CreateFileDocumentRequest,
  CreateLinkDocumentRequest,
  DocumentFileUrl,
  TripDocument,
  UpdateDocumentRequest,
} from "@7trip/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/auth/auth-context";

export const documentKeys = {
  list: (tripId: string) => ["documents", tripId] as const,
  detail: (tripId: string, documentId: string) =>
    ["documents", tripId, documentId] as const,
};

/** A file picked on the device, as fetch sends it in a multipart body. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export function useDocuments(tripId: string) {
  const { tripRequest } = useAuth();
  return useQuery({
    queryKey: documentKeys.list(tripId),
    queryFn: () =>
      tripRequest<TripDocument[]>(tripId, `/trips/${tripId}/documents`),
  });
}

/** Opens instantly from the list, then refreshes. */
export function useDocument(tripId: string, documentId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  return useQuery({
    queryKey: documentKeys.detail(tripId, documentId),
    queryFn: () =>
      tripRequest<TripDocument>(
        tripId,
        `/trips/${tripId}/documents/${documentId}`,
      ),
    initialData: () =>
      client
        .getQueryData<TripDocument[]>(documentKeys.list(tripId))
        ?.find((doc) => doc.id === documentId),
    initialDataUpdatedAt: () =>
      client.getQueryState(documentKeys.list(tripId))?.dataUpdatedAt,
  });
}

function useRefreshDocuments(tripId: string) {
  const client = useQueryClient();
  return (doc?: TripDocument) => {
    if (doc) client.setQueryData(documentKeys.detail(tripId, doc.id), doc);
    void client.invalidateQueries({
      queryKey: documentKeys.list(tripId),
      exact: true,
    });
  };
}

/** A file, or a link: the one form adds both. */
export function useAddDocument(tripId: string) {
  const { tripRequest } = useAuth();
  const refresh = useRefreshDocuments(tripId);
  return useMutation({
    mutationFn: (
      input:
        | { file: PickedFile; meta: CreateFileDocumentRequest }
        | { link: CreateLinkDocumentRequest },
    ) => {
      if ("link" in input)
        return tripRequest<TripDocument>(
          tripId,
          `/trips/${tripId}/documents/links`,
          { method: "POST", body: input.link },
        );
      const body = new FormData();
      body.append("meta", JSON.stringify(input.meta));
      // React Native's FormData takes a file as { uri, name, type }.
      body.append("file", {
        uri: input.file.uri,
        name: input.file.name,
        type: input.file.mimeType,
      } as unknown as Blob);
      return tripRequest<TripDocument>(tripId, `/trips/${tripId}/documents`, {
        method: "POST",
        body,
      });
    },
    onSuccess: refresh,
  });
}

export function useUpdateDocument(tripId: string, documentId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const refresh = useRefreshDocuments(tripId);
  return useMutation({
    mutationFn: (body: UpdateDocumentRequest) =>
      tripRequest<TripDocument>(
        tripId,
        `/trips/${tripId}/documents/${documentId}`,
        { method: "PATCH", body },
      ),
    onSuccess: refresh,
    // Changed or removed elsewhere meanwhile: show what the server has now.
    onError: () => {
      void client.invalidateQueries({
        queryKey: documentKeys.detail(tripId, documentId),
      });
      refresh();
    },
  });
}

export function useDeleteDocument(tripId: string, documentId: string) {
  const { tripRequest } = useAuth();
  const client = useQueryClient();
  const refresh = useRefreshDocuments(tripId);
  return useMutation({
    mutationFn: () =>
      tripRequest<void>(tripId, `/trips/${tripId}/documents/${documentId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      client.setQueryData<TripDocument[]>(documentKeys.list(tripId), (docs) =>
        docs?.filter((doc) => doc.id !== documentId),
      );
      client.removeQueries({
        queryKey: documentKeys.detail(tripId, documentId),
      });
      refresh();
    },
  });
}

/** A link opens as it is; a file through a short-lived link asked for at that moment. */
export function useOpenDocument(tripId: string) {
  const { tripRequest } = useAuth();
  return useMutation({
    mutationFn: async (doc: TripDocument) => {
      const url =
        doc.kind === "LINK"
          ? doc.url!
          : (
              await tripRequest<DocumentFileUrl>(
                tripId,
                `/trips/${tripId}/documents/${doc.id}/url`,
              )
            ).url;
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    },
  });
}
