import { GUEST_TOKEN_HEADER, type ApiErrorBody } from '@7trip/shared';
import { onlineManager } from '@tanstack/react-query';
import { File, UploadType } from 'expo-file-system';

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
  /**
   * A file sent as multipart (`file`), with text fields beside it. Sent natively by
   * expo-file-system: Expo's fetch does not take React Native's `{ uri, name, type }` parts.
   */
  upload?: { uri: string; mimeType: string; fields: Record<string, string> };
}

const NETWORK_ERROR = () => new ApiError(0, 'NETWORK', 'Impossible de joindre 7Trip. Vérifie ta connexion.');

export async function apiRequest<T>(path: string, { method = 'GET', body, accessToken, guestToken, upload }: RequestOptions = {}): Promise<T> {
  // Read-only offline (docs/architecture.md §8): a change is refused here, with why.
  if (method !== 'GET' && !onlineManager.isOnline()) {
    throw new ApiError(0, 'OFFLINE', 'Tu es hors ligne : cette modification pourra se faire quand le réseau reviendra.');
  }
  const url = `${apiUrl}/v1${path}`;
  const headers = {
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(guestToken ? { [GUEST_TOKEN_HEADER]: guestToken } : {}),
  };
  let status: number;
  let text: string;
  try {
    if (upload) {
      const result = await new File(upload.uri).upload(url, {
        httpMethod: method === 'GET' || method === 'DELETE' ? 'POST' : method,
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: upload.mimeType,
        parameters: upload.fields,
        headers,
      });
      ({ status, body: text } = result);
    } else {
      const response = await fetch(url, {
        method,
        headers: { ...headers, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      status = response.status;
      text = await response.text();
    }
  } catch (error) {
    if (__DEV__) console.warn(`[api] ${method} ${path} failed before any answer:`, error);
    throw NETWORK_ERROR();
  }

  if (status === 204) return undefined as T;
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }
  if (status >= 200 && status < 300) return payload as T;

  const error = (payload ?? {}) as Partial<ApiErrorBody> & { message?: unknown };
  if (status === 429) {
    throw new ApiError(429, 'TOO_MANY_REQUESTS', 'Trop de tentatives, réessaie dans une minute.');
  }
  // Proxy / tunnel errors (502, 503…) come back as HTML, not as our JSON error body.
  if (status >= 500 && typeof error.code !== 'string') {
    throw new ApiError(status, 'SERVER_UNAVAILABLE', 'Le serveur 7Trip ne répond pas pour le moment, réessaie dans un instant.');
  }
  throw new ApiError(
    status,
    typeof error.code === 'string' ? error.code : 'UNKNOWN',
    typeof error.message === 'string' ? error.message : 'Une erreur est survenue, réessaie.',
    error.fields,
  );
}

/** What to show the user when a request fails: the API's message, or a generic retry hint. */
export const errorMessage = (error: unknown) => (error instanceof ApiError ? error.message : 'Réessaie dans un instant.');
