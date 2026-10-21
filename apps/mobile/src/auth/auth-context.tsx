import type { AuthResponse, Me } from '@7trip/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ApiError, apiRequest, type RequestOptions } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { clearRefreshToken, loadRefreshToken, saveRefreshToken } from '@/lib/session-store';

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<Me | null>(null);
  const [devEmailCode, setDevCode] = useState<string | null>(null);
  const accessToken = useRef<string | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);
  /** Bumped on every sign-in / sign-out, so a refresh started before it cannot bring the old session back. */
  const epoch = useRef(0);

  const applySession = useCallback(async (session: AuthResponse) => {
    accessToken.current = session.accessToken;
    await saveRefreshToken(session.refreshToken);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const resetSession = useCallback(async () => {
    epoch.current += 1;
    accessToken.current = null;
    // Never show one account's data to the next one.
    queryClient.clear();
    await clearRefreshToken();
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
    void refreshAccessToken().then((token) => {
      if (!token) setStatus((current) => (current === 'loading' ? 'signedOut' : current));
    });
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
      setUser,
      authedRequest,
    }),
    [status, user, devEmailCode, applySession, signOut, authedRequest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
