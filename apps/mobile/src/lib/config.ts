/**
 * Base URL of the 7Trip API. On a physical device, set EXPO_PUBLIC_API_URL to your computer's
 * LAN or Tailscale address (e.g. http://100.x.y.z:3100) — `localhost` there is the phone itself.
 */
export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3100';
