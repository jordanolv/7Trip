import type { AuthResponse, Me } from '@7trip/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ApiError, apiRequest, type RequestOptions } from '@/lib/api';
import { clearOffline, removeOfflineTrip } from '@/documents/offline-documents';
import { clearQueryCache, queryClient } from '@/lib/query-client';
import { loadGuestSessions, saveGuestSessions, type GuestSessions } from '@/lib/guest-store';
import { unregisterPushToken } from '@/notifications/push';
import { clearRefreshToken, clearUser, loadRefreshToken, loadUser, saveRefreshToken, saveUser } from '@/lib/session-store';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: Me | null;
  /** Code echoed by the API when emails are only logged (development), to test flows on a phone. */
  devEmailCode: string | null;
  setDevEmailCode: (code: string | null | undefined) => void;
  /** Stores a session returned by login / register / reset-password. */
  signIn: (session: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: Me) => void;
  /** Calls the API as the signed-in user, refreshing the access token once if it expired. */
  authedRequest: <T>(path: string, options?: Omit<RequestOptions, 'accessToken'>) => Promise<T>;
  /** Trips joined on this device without an account: { [tripId]: guest token }. */
  guestSessions: GuestSessions;
  addGuestSession: (tripId: string, token: string) => Promise<void>;
  removeGuestSession: (tripId: string) => Promise<void>;
  /** Calls a route of one trip: with its guest session when there is one, otherwise as the user. */
  tripRequest: <T>(tripId: string, path: string, options?: Omit<RequestOptions, 'accessToken' | 'guestToken'>) => Promise<T>;
}

type TripRequestOptions = Omit<RequestOptions, 'accessToken' | 'guestToken'>;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Me | null>(null);
  const [devEmailCode, setDevCode] = useState<string | null>(null);
  const accessToken = useRef<string | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);
  /** Bumped on every sign-in / sign-out, so a refresh started before it cannot bring the old session back. */
  const epoch = useRef(0);
  const [guestSessions, setGuestSessions] = useState<GuestSessions>({});
  /** Mirror of guestSessions for the request callbacks, which must not change identity. */
  const guests = useRef<GuestSessions>({});
  const claiming = useRef(false);

  const updateGuests = useCallback(async (change: (sessions: GuestSessions) => GuestSessions) => {
    guests.current = change(guests.current);
    setGuestSessions(guests.current);
    await saveGuestSessions(guests.current);
  }, []);

  const applySession = useCallback(async (session: AuthResponse) => {
    accessToken.current = session.accessToken;
    await saveRefreshToken(session.refreshToken);
    setUser(session.user);
    void saveUser(session.user);
    setStatus('signedIn');
  }, []);

  const resetSession = useCallback(async () => {
    epoch.current += 1;
    accessToken.current = null;
    // Every sign-out, asked for or not (session expired or revoked): this phone stops receiving the
    // account's notifications, now or once back online.
    await unregisterPushToken();
    // Never show one account's data to the next one, nor its saved documents.
    await clearQueryCache();
    clearOffline();
    await clearRefreshToken();
    await clearUser();
    setUser(null);
    setDevCode(null);
    setStatus('signedOut');
  }, []);

  /** Single-flight refresh: concurrent 401s share one refresh call. */
  const refreshAccessToken = useCallback((): Promise<string | null> => {
    refreshing.current ??= (async () => {
      const startedAt = epoch.current;
      try {
        const refreshToken = await loadRefreshToken();
        if (!refreshToken) return null;
        const session = await apiRequest<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } });
        if (epoch.current !== startedAt) {
          // Signed out (or in again) meanwhile: drop this session server side too.
          void apiRequest('/auth/logout', { method: 'POST', body: { refreshToken: session.refreshToken } }).catch(() => undefined);
          return null;
        }
        await applySession(session);
        return session.accessToken;
      } catch (error) {
        // Offline: keep the stored session and try again later. Rejected token: sign out.
        if (error instanceof ApiError && error.status === 401 && epoch.current === startedAt) await resetSession();
        return null;
      } finally {
        refreshing.current = null;
      }
    })();
    return refreshing.current;
  }, [applySession, resetSession]);

  useEffect(() => {
    void (async () => {
      // Guest sessions first: trip screens may need them as soon as the app is ready.
      guests.current = await loadGuestSessions();
      setGuestSessions(guests.current);
      const token = await refreshAccessToken();
      if (token) return;
      // Not refreshed but still stored: no network. The account opens on what was saved, and the
      // token is refreshed on the first request once online.
      const offlineUser = (await loadRefreshToken()) ? await loadUser<Me>() : null;
      if (offlineUser) setUser(offlineUser);
      setStatus((current) => (current === 'loading' ? (offlineUser ? 'signedIn' : 'signedOut') : current));
    })();
  }, [refreshAccessToken]);

  const authedRequest = useCallback(
    async <T,>(path: string, options: Omit<RequestOptions, 'accessToken'> = {}): Promise<T> => {
      const token = accessToken.current ?? (await refreshAccessToken());
      try {
        return await apiRequest<T>(path, { ...options, accessToken: token });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        const renewed = await refreshAccessToken();
        if (!renewed) throw error;
        return apiRequest<T>(path, { ...options, accessToken: renewed });
      }
    },
    [refreshAccessToken],
  );

  const removeGuestSession = useCallback(
    (tripId: string) =>
      updateGuests((sessions) => {
        const { [tripId]: _removed, ...rest } = sessions;
        return rest;
      }),
    [updateGuests],
  );

  const tripRequest = useCallback(
    async <T,>(tripId: string, path: string, options: TripRequestOptions = {}): Promise<T> => {
      const guestToken = guests.current[tripId];
      if (!guestToken) return authedRequest<T>(path, options);
      try {
        return await apiRequest<T>(path, { ...options, guestToken });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        // The session is over: claimed by the account just signed in (then retry as the user),
        // or removed from the trip / left from another screen.
        await removeGuestSession(tripId);
        // Its saved documents go too; if the account now has the trip, they can be saved again.
        removeOfflineTrip(tripId);
        if (accessToken.current) return authedRequest<T>(path, options);
        throw new ApiError(404, 'NOT_FOUND', 'Tu ne fais plus partie de ce voyage.');
      }
    },
    [authedRequest, removeGuestSession],
  );

  // Guest → account: once signed in, this device's guest sessions become participations of the account.
  useEffect(() => {
    const tokens = Object.entries(guestSessions);
    if (status !== 'signedIn' || tokens.length === 0 || claiming.current) return;
    claiming.current = true;
    void authedRequest('/me/guest-sessions/claim', { method: 'POST', body: { tokens: tokens.map(([, token]) => token) } })
      .then(async () => {
        await updateGuests((sessions) => Object.fromEntries(Object.entries(sessions).filter(([tripId]) => !tokens.some(([id]) => id === tripId))));
        void queryClient.invalidateQueries({ queryKey: ['trips'] });
        // Now seen as the account, which got the guest's expenses and votes: fetched again.
        void queryClient.invalidateQueries({ predicate: (query) => tokens.some(([tripId]) => query.queryKey[1] === tripId) });
      })
      // Offline or failing: kept, and tried again on the next sign-in or launch.
      .catch(() => undefined)
      .finally(() => {
        claiming.current = false;
      });
  }, [status, guestSessions, authedRequest, updateGuests]);

  const signOut = useCallback(async () => {
    // Local sign-out is immediate; a refresh still in flight is discarded and revoked when it lands.
    const refreshToken = await loadRefreshToken();
    await resetSession();
    if (refreshToken) {
      await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    }
  }, [resetSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      devEmailCode,
      setDevEmailCode: (code) => setDevCode(code ?? null),
      signIn: (session) => {
        epoch.current += 1;
        return applySession(session);
      },
      signOut,
      setUser: (next) => {
        setUser(next);
        void saveUser(next);
      },
      authedRequest,
      guestSessions,
      addGuestSession: (tripId, token) => updateGuests((sessions) => ({ ...sessions, [tripId]: token })),
      removeGuestSession,
      tripRequest,
    }),
    [status, user, devEmailCode, applySession, signOut, authedRequest, guestSessions, updateGuests, removeGuestSession, tripRequest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
