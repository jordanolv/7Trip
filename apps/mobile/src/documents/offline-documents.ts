import type { DocumentFileUrl, TripDocument } from '@7trip/shared';
import { useQuery } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';

import { queryClient } from '@/lib/query-client';

/**
 * Documents marked "Disponible hors ligne" (docs/decisions.md): a copy in the app's own folder,
 * one per trip, named by the document's id. A copy whose document can no longer be seen (deleted,
 * made private, trip left) is removed the next time the list is fetched.
 */
const root = () => new Directory(Paths.document, 'offline-documents');
const tripDir = (tripId: string) => new Directory(root(), tripId);
const extension = (mime: string | null) => (mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : 'jpg');
const localFile = (doc: Pick<TripDocument, 'id' | 'tripId' | 'mime'>) => new File(tripDir(doc.tripId), `${doc.id}.${extension(doc.mime)}`);
const idOf = (entry: File | Directory) => entry.name.replace(/\.[a-z]+$/, '');

export const offlineKeys = { trip: (tripId: string) => ['offline-documents', tripId] as const };

/** The ids saved on this device for the trip. Read from the folder: no network, never persisted. */
export function useOfflineDocuments(tripId: string) {
  return useQuery({
    queryKey: offlineKeys.trip(tripId),
    queryFn: () => {
      const dir = tripDir(tripId);
      return dir.exists ? dir.list().map(idOf) : [];
    },
    networkMode: 'always',
    staleTime: Infinity,
  });
}

/** The copy on the device, if any. */
export function offlineCopy(doc: Pick<TripDocument, 'id' | 'tripId' | 'mime'>): File | null {
  const file = localFile(doc);
  return file.exists ? file : null;
}

/** Downloads the file through a short-lived link (asked for by the caller, after the usual check). */
export async function saveOffline(doc: TripDocument, link: () => Promise<DocumentFileUrl>): Promise<void> {
  const dir = tripDir(doc.tripId);
  dir.create({ intermediates: true, idempotent: true });
  const { url } = await link();
  await File.downloadFileAsync(url, localFile(doc), { idempotent: true });
  void queryClient.invalidateQueries({ queryKey: offlineKeys.trip(doc.tripId) });
}

export function removeOffline(doc: Pick<TripDocument, 'id' | 'tripId' | 'mime'>): void {
  offlineCopy(doc)?.delete();
  void queryClient.invalidateQueries({ queryKey: offlineKeys.trip(doc.tripId) });
}

/** After a fresh list: copies of documents no longer in it go (docs/decisions.md, "Après révocation"). */
export function pruneOffline(tripId: string, visible: TripDocument[]): void {
  const dir = tripDir(tripId);
  if (!dir.exists) return;
  const keep = new Set(visible.filter((doc) => doc.kind === 'FILE').map((doc) => doc.id));
  const gone = dir.list().filter((entry) => !keep.has(idOf(entry)));
  for (const entry of gone) entry.delete();
  if (gone.length) void queryClient.invalidateQueries({ queryKey: offlineKeys.trip(tripId) });
}

/** After a fresh list of trips: the copies of trips left or deleted go. */
export function pruneOfflineTrips(tripIds: string[]): void {
  const dir = root();
  if (!dir.exists) return;
  const keep = new Set(tripIds);
  for (const entry of dir.list()) if (!keep.has(entry.name)) entry.delete();
}

/** The trip left, deleted, or its guest session over: its copies go. */
export function removeOfflineTrip(tripId: string): void {
  const dir = tripDir(tripId);
  if (dir.exists) dir.delete();
  void queryClient.invalidateQueries({ queryKey: offlineKeys.trip(tripId) });
}

/** On sign-out: nothing of the account stays on the device. */
export function clearOffline(): void {
  const dir = root();
  if (dir.exists) dir.delete();
}
