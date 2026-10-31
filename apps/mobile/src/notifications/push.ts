import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

// Shown even when the app is open: the banner is the only sign a trip changed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** The token this phone was registered with, to stop its notifications on sign-out. */
let registered: string | null = null;
export const registeredPushToken = () => registered;
export const forgetPushToken = () => {
  registered = null;
};
export const rememberPushToken = (token: string) => {
  registered = token;
};

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
