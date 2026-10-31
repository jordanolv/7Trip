import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { apiRequest } from '@/lib/api';

// Shown even when the app is open: the banner is the only sign a trip changed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/**
 * The token this phone was last registered with, kept on the phone: a sign-out after an offline
 * restart (no registration that time) must still remove it.
 */
const REGISTERED_KEY = '7trip-push-token';
export const rememberPushToken = (token: string) => AsyncStorage.setItem(REGISTERED_KEY, token).catch(() => undefined);

/** A removal that could not reach the API (signed out offline), sent again once back online. */
const PENDING_REMOVAL_KEY = '7trip-push-token-removal';

/**
 * On sign-out: this phone stops receiving the account's notifications. Written down first, sent
 * in the background: the sign-out does not wait for the network, and an attempt that fails is
 * made again once back online.
 */
export async function unregisterPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(REGISTERED_KEY).catch(() => null);
  if (!token) return;
  await AsyncStorage.setItem(PENDING_REMOVAL_KEY, token).catch(() => undefined);
  await AsyncStorage.removeItem(REGISTERED_KEY).catch(() => undefined);
  void sendPendingRemoval();
}

let removing: Promise<void> | null = null;

/**
 * Sends the removal written down at sign-out. One at a time: a new registration awaits it, so the
 * removal cannot reach the API after it and take the phone from the new account.
 */
export function sendPendingRemoval(): Promise<void> {
  removing ??= (async () => {
    try {
      const token = await AsyncStorage.getItem(PENDING_REMOVAL_KEY).catch(() => null);
      if (!token) return;
      await apiRequest<void>('/me/push-tokens', { method: 'DELETE', body: { token } });
      await AsyncStorage.removeItem(PENDING_REMOVAL_KEY);
    } catch {
      // Still unreachable: tried again on the next return of the network.
    } finally {
      removing = null;
    }
  })();
  return removing;
}

/**
 * This phone's Expo push token, asking for permission the first time. Null on a simulator, when
 * refused, or when Expo cannot give one (Expo Go on Android since SDK 53).
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: '7Trip', importance: AndroidImportance.DEFAULT });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status === 'undetermined') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    if (__DEV__) console.warn('[7trip] no push token', error);
    return null;
  }
}
