import * as SecureStore from 'expo-secure-store';

// Only the refresh token is persisted (Keychain / Keystore). The access token lives in memory.
const REFRESH_TOKEN_KEY = 'seventrip.refreshToken';

export function loadRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export function saveRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// The signed-in profile, kept so the app opens offline on the account (docs/architecture.md §8).
const USER_KEY = 'seventrip.user';

export async function loadUser<T>(): Promise<T | null> {
  const json = await SecureStore.getItemAsync(USER_KEY);
  try {
    return json ? (JSON.parse(json) as T) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: unknown): Promise<void> {
  return SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export function clearUser(): Promise<void> {
  return SecureStore.deleteItemAsync(USER_KEY);
}
