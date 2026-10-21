import { GUEST_TOKEN_HEADER, type ApiErrorBody } from '@7trip/shared';

import { apiUrl } from './config';

/** Error thrown by every API call; `code` is either an API error code or NETWORK / UNKNOWN. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
  /** Guest session token: opens one trip without an account. */
  guestToken?: string | null;
}

export async function apiRequest<T>(path: string, { method = 'GET', body, accessToken, guestToken }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(guestToken ? { [GUEST_TOKEN_HEADER]: guestToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Impossible de joindre 7Trip. Vérifie ta connexion.');
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.ok) return payload as T;

  const error = (payload ?? {}) as Partial<ApiErrorBody> & { message?: unknown };
  if (response.status === 429) {
    throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Trop de tentatives, réessaie dans une minute.');
  }
  // Proxy / tunnel errors (502, 503…) come back as HTML, not as our JSON error body.
  if (response.status >= 500 && typeof error.code !== 'string') {
    throw new ApiError(response.status, 'SERVER_UNAVAILABLE', 'Le serveur 7Trip ne répond pas pour le moment, réessaie dans un instant.');
  }
  throw new ApiError(
    response.status,
    typeof error.code === 'string' ? error.code : 'UNKNOWN',
    typeof error.message === 'string' ? error.message : 'Une erreur est survenue, réessaie.',
    error.fields,
  );
}

/** What to show the user when a request fails: the API's message, or a generic retry hint. */
export const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : 'Réessaie dans un instant.');
