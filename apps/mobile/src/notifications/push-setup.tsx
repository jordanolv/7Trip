import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/auth/auth-context';
import { useIsOnline } from '@/lib/online';
import { getPushToken, rememberPushToken } from './push';

/**
 * Registers this phone for the signed-in account (again once back online: a registration made
 * offline was refused), and opens the screen a tapped notification is about.
 */
export function PushSetup() {
  const { status, user, authedRequest } = useAuth();
  const online = useIsOnline();
  const userId = status === 'signedIn' ? user?.id : undefined;

  useEffect(() => {
    if (!userId || !online) return;
    let cancelled = false;
    void (async () => {
      const token = await getPushToken();
      if (!token || cancelled) return;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        await authedRequest<void>('/me/push-tokens', { method: 'PUT', body: { token, timeZone } });
        rememberPushToken(token);
      } catch (error) {
        if (__DEV__) console.warn('[7trip] push registration failed', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, online, authedRequest]);

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
