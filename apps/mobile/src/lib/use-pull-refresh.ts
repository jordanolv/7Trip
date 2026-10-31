import { useCallback, useState } from 'react';

/**
 * Pull-to-refresh state that only follows the user's pull. Bound to a query's isRefetching instead,
 * every background refetch (each visit, each focus) would show the spinner and push the page down.
 */
export function usePullRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  }, [refresh]);
  return { refreshing, onRefresh };
}
