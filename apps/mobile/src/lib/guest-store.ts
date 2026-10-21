import * as SecureStore from 'expo-secure-store';

// Guest sessions of this device, one per trip joined without an account: { [tripId]: token }.
const GUEST_SESSIONS_KEY = 'seventrip.guestSessions';

export type GuestSessions = Record<string, string>;

export async function loadGuestSessions(): Promise<GuestSessions> {
  try {
    const raw = await SecureStore.getItemAsync(GUEST_SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as GuestSessions) : {};
  } catch {
    return {};
  }
}

export function saveGuestSessions(sessions: GuestSessions): Promise<void> {
  return Object.keys(sessions).length > 0
    ? SecureStore.setItemAsync(GUEST_SESSIONS_KEY, JSON.stringify(sessions))
    : SecureStore.deleteItemAsync(GUEST_SESSIONS_KEY);
}
