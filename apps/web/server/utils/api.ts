import { GUEST_TOKEN_HEADER, type ApiErrorBody } from '@7trip/shared';
import type { H3Event } from 'h3';

interface ApiOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  guestToken?: string;
}

/**
 * Calls the 7Trip API from the web server. Forwards the visitor's IP, so the API rate-limits
 * each visitor and not the web server as a whole (the API trusts X-Forwarded-For from loopback).
 */
export async function callApi<T>(event: H3Event, path: string, { method = 'GET', body, guestToken }: ApiOptions = {}): Promise<T> {
  const { apiUrl } = useRuntimeConfig(event);
  const ip = visitorIp(event);
  try {
    // An external URL: Nitro's route typing does not apply.
    const result: unknown = await $fetch(`${apiUrl}${path}`, {
      method,
      body,
      headers: {
        ...(guestToken ? { [GUEST_TOKEN_HEADER]: guestToken } : {}),
        ...(ip ? { 'x-forwarded-for': ip } : {}),
      },
    });
    return result as T;
  } catch (error) {
    const response = error as { statusCode?: number; data?: Partial<ApiErrorBody> };
    throw createError({
      statusCode: response.statusCode ?? 502,
      message: response.data?.message ?? 'Le serveur 7Trip ne répond pas pour le moment, réessaie dans un instant.',
      data: { code: response.data?.code ?? 'SERVER_UNAVAILABLE', fields: response.data?.fields },
    });
  }
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * The visitor's address, as seen by our own reverse proxy (nginx / tunnel, on this machine).
 * X-Forwarded-For is only read when the request comes from that local proxy, and only its last
 * entry, the one the proxy appended: anything before it was written by the client.
 */
function visitorIp(event: H3Event): string | undefined {
  const peer = event.node.req.socket.remoteAddress;
  if (!peer || !LOOPBACK.has(peer)) return peer;
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return forwarded?.at(-1) ?? peer;
}

/** One HttpOnly cookie per trip joined as a guest: it holds the guest session token. */
export const guestCookieName = (tripId: string) => `g_${tripId}`;

export function setGuestCookie(event: H3Event, tripId: string, token: string) {
  setCookie(event, guestCookieName(tripId), token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
