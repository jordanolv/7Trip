import { useEffect, useState } from 'react';

import { apiUrl } from './config';

export type ApiHealth = 'checking' | 'up' | 'down';

export function useApiHealth(): ApiHealth {
  const [health, setHealth] = useState<ApiHealth>('checking');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiUrl}/v1/health`, { signal: controller.signal })
      .then((response) => setHealth(response.ok ? 'up' : 'down'))
      .catch(() => {
        if (!controller.signal.aborted) setHealth('down');
      });
    return () => controller.abort();
  }, []);

  return health;
}
