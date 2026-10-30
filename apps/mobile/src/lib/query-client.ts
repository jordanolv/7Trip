import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { ApiError } from './api';
import './online';

/** What was loaded stays readable offline this long (docs/architecture.md §8). */
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Kept as long as it is persisted: an unused query must still be there offline.
      gcTime: KEEP_MS,
      // Retrying a 4xx (not found, forbidden…) never helps.
      retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
    // Offline, a change fails at once with its message (read-only), instead of waiting unseen.
    mutations: { networkMode: 'always' },
  },
});

/**
 * The cache saved on the device, restored on the next launch. Cleared with the cache when the
 * session ends: one account's data is never shown to the next.
 */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: '7trip-query-cache', throttleTime: 2000 }),
  maxAge: KEEP_MS,
  // A new app version may read data differently: start again from the network.
  buster: '1',
  // What is saved on the device is read from the device itself.
  dehydrateOptions: { shouldDehydrateQuery: (query) => query.state.status === 'success' && query.queryKey[0] !== 'offline-documents' },
};
