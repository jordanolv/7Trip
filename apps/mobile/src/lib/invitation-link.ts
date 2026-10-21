import * as Linking from 'expo-linking';

/**
 * Link shared to invite someone. Until the 7trip.app domain and universal links exist (step 3),
 * it opens the app directly: an exp:// link in Expo Go, seventrip:// in a build.
 * Set EXPO_PUBLIC_INVITE_BASE_URL (e.g. https://7trip.app) to switch to web links.
 */
export function invitationUrl(code: string): string {
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL;
  return base ? `${base.replace(/\/$/, '')}/j/${code}` : Linking.createURL(`/j/${code}`);
}

/** Code opened while signed out, to come back to once signed in. */
let pendingCode: string | null = null;

export function setPendingInvitation(code: string | null) {
  pendingCode = code;
}

export function takePendingInvitation(): string | null {
  const code = pendingCode;
  pendingCode = null;
  return code;
}
