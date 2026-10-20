import { useCallback, useState } from 'react';

import { ApiError } from './api';

export interface ActionState {
  loading: boolean;
  /** General error message, shown under the form. */
  error: string | null;
  /** Per-field messages returned by the API (VALIDATION_FAILED). */
  fieldErrors: Record<string, string>;
}

/** Runs an async form action, tracking loading and turning API errors into displayable messages. */
export function useAction<Args extends unknown[]>(action: (...args: Args) => Promise<void>) {
  const [state, setState] = useState<ActionState>({ loading: false, error: null, fieldErrors: {} });

  const run = useCallback(
    async (...args: Args) => {
      setState({ loading: true, error: null, fieldErrors: {} });
      try {
        await action(...args);
        setState({ loading: false, error: null, fieldErrors: {} });
      } catch (error) {
        if (error instanceof ApiError) {
          const fieldErrors = error.fields ?? {};
          setState({ loading: false, error: Object.keys(fieldErrors).length ? null : error.message, fieldErrors });
        } else {
          setState({ loading: false, error: 'Une erreur est survenue, réessaie.', fieldErrors: {} });
        }
      }
    },
    [action],
  );

  const setError = useCallback((error: string | null) => setState((s) => ({ ...s, error })), []);

  return { ...state, run, setError };
}
