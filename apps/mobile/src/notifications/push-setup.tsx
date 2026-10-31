import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { useIsOnline } from '@/lib/online';
import { getPushToken, rememberPushToken, sendPendingRemoval } from './push';

/**
 * Registers this phone for the signed-in account, after sending what an offline sign-out left to
 * remove. Again once back online (a registration made offline was refused) and each time the app
 * comes back to the foreground (notifications may have been allowed in the settings meanwhile).
 * Opens the screen a tapped notification is about.
 */
export function PushSetup() {
  const { status, user, authedRequest } = useAuth();
  const online = useIsOnline();
  const userId = status === 'signedIn' ? user?.id : undefined;
  const foregrounds = useForegrounds();

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    void (async () => {
      // First: removed after a new registration, it would take the phone from the new account.
      await sendPendingRemoval();
      if (!userId || cancelled) return;
      const token = await getPushToken();
      if (!token || cancelled) return;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        await authedRequest<void>('/me/push-tokens', { method: 'PUT', body: { token, timeZone } });
        await rememberPushToken(token);
      } catch (error) {
        if (__DEV__) console.warn('[7trip] push registration failed', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, online, foregrounds, authedRequest]);

  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    // Kept by the system until cleared: the next launch must not open it again.
    Notifications.clearLastNotificationResponse();
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/voyage/')) router.push(url as Href);
  }, [response]);

  return null;
}

/** Counts the returns of the app to the foreground. */
function useForegrounds(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setCount((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);
  return count;
}
