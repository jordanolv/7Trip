import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

// Queries pause without a network and start again when it comes back (docs/architecture.md §8).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    // Unknown (null) counts as online: only a known lack of network switches to offline.
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

/** Whether the device can reach the network; re-renders when that changes. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
