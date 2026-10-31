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

/** The token this phone was registered with, to stop its notifications on sign-out. */
let registered: string | null = null;
export const rememberPushToken = (token: string) => {
  registered = token;
};

/** A removal that could not reach the API (signed out offline), sent again once back online. */
const PENDING_REMOVAL_KEY = '7trip-push-token-removal';

/** On sign-out: this phone stops receiving the account's notifications, now or once online. */
export async function unregisterPushToken(): Promise<void> {
  const token = registered;
  if (!token) return;
  registered = null;
  try {
    await apiRequest<void>('/me/push-tokens', { method: 'DELETE', body: { token } });
  } catch {
    await AsyncStorage.setItem(PENDING_REMOVAL_KEY, token).catch(() => undefined);
  }
}

/** Sends the removal left over from an offline sign-out. Before any new registration of the phone. */
export async function sendPendingRemoval(): Promise<void> {
  const token = await AsyncStorage.getItem(PENDING_REMOVAL_KEY).catch(() => null);
  if (!token) return;
  try {
    await apiRequest<void>('/me/push-tokens', { method: 'DELETE', body: { token } });
    await AsyncStorage.removeItem(PENDING_REMOVAL_KEY);
  } catch {
    // Still unreachable: tried again on the next return of the network.
  }
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
