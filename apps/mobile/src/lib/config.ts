/**
 * Base URL of the 7Trip API. On a physical device, set EXPO_PUBLIC_API_URL to your computer's
 * LAN address (e.g. http://192.168.1.20:3000) — `localhost` there is the phone itself.
 */
export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
