import { AppState, Platform } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';

export function installQueryLifecycle(): () => void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const online = () => onlineManager.setOnline(navigator.onLine);
    const focus = () => focusManager.setFocused(document.visibilityState !== 'hidden');
    online();
    focus();
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    document.addEventListener('visibilitychange', focus);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
      document.removeEventListener('visibilitychange', focus);
    };
  }
  let disposed = false;
  let unsubscribe = () => {};
  const state = AppState.addEventListener('change', (value) =>
    focusManager.setFocused(value === 'active'),
  );
  void import('@react-native-community/netinfo')
    .then(({ default: NetInfo }) => {
      if (disposed) return;
      unsubscribe = NetInfo.addEventListener((status) => {
        // Null means reachability is still being determined, not a confirmed outage.
        onlineManager.setOnline(
          status.isConnected !== false && status.isInternetReachable !== false,
        );
      });
    })
    .catch(() => {});
  return () => {
    disposed = true;
    unsubscribe();
    state.remove();
  };
}
