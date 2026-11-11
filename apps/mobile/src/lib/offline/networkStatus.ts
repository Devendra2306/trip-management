import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { syncQueue } from './syncQueue';

type Listener = (isOnline: boolean) => void;
const listeners = new Set<Listener>();

let isConnected = true;

NetInfo.addEventListener((state: NetInfoState) => {
  const online = Boolean(state.isConnected && state.isInternetReachable !== false);
  const changed = online !== isConnected;
  isConnected = online;

  if (changed) {
    listeners.forEach((listener) => listener(online));

    // If we just reconnected, trigger pending offline sync!
    if (online) {
      syncQueue.syncAll().then(({ synced }) => {
        if (synced > 0) {
          console.log(`Synced ${synced} offline expenses.`);
        }
      });
    }
  }
});

export const networkStatus = {
  isOnline(): boolean {
    return isConnected;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(isConnected);
    return () => listeners.delete(listener);
  },
};
