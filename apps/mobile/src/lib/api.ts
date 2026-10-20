import type { ApiErrorBody } from '@7trip/shared';

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
}

export async function apiRequest<T>(path: string, { method = 'GET', body, accessToken }: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
  throw new ApiError(
    response.status,
    typeof error.code === 'string' ? error.code : 'UNKNOWN',
    typeof error.message === 'string' ? error.message : 'Une erreur est survenue, réessaie.',
    error.fields,
  );
}
