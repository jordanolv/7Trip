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
