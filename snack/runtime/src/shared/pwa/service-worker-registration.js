import { Platform } from 'react-native';
export const SESSION_SYNC_CHANNEL = 'smartbarber-session-sync';
const SESSION_EVENT_KEY = 'smartbarber-session-change';
export function registerWebServiceWorker(onRemoteLogout) {
    if (Platform.OS !== 'web' || typeof window === 'undefined')
        return () => { };
    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            channel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
            channel.onmessage = (event) => {
                var _a;
                if (((_a = event.data) === null || _a === void 0 ? void 0 : _a.type) === 'SESSION_LOGOUT')
                    onRemoteLogout === null || onRemoteLogout === void 0 ? void 0 : onRemoteLogout();
            };
        }
        catch {
            channel = null;
        }
    }
    const onStorage = (event) => {
        if (event.key === SESSION_EVENT_KEY && event.newValue)
            onRemoteLogout === null || onRemoteLogout === void 0 ? void 0 : onRemoteLogout();
    };
    window.addEventListener('storage', onStorage);
    const onLoad = () => {
        if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production')
            return;
        if (process.env.EXPO_PUBLIC_ENABLE_PWA_CACHE === 'false') {
            void navigator.serviceWorker
                .getRegistrations()
                .then((registrations) => Promise.all(registrations
                .filter((registration) => { var _a; return ((_a = registration.active) === null || _a === void 0 ? void 0 : _a.scriptURL) === new URL('/sw.js', window.location.origin).href; })
                .map((registration) => registration.unregister())))
                .catch(() => { });
            return;
        }
        navigator.serviceWorker
            .register('/sw.js', { updateViaCache: 'none' })
            .then(async () => {
            var _a;
            const registration = await navigator.serviceWorker.ready;
            const urls = performance
                .getEntriesByType('resource')
                .map((entry) => entry.name)
                .filter((value) => {
                const url = new URL(value, window.location.origin);
                return (url.origin === window.location.origin &&
                    !url.search &&
                    (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')));
            })
                .slice(-40);
            (_a = registration.active) === null || _a === void 0 ? void 0 : _a.postMessage({ type: 'CACHE_PUBLIC_ASSETS', urls });
        })
            .catch(() => {
            // Ignore service worker registration errors in unsupported environments
        });
    };
    if (document.readyState === 'complete')
        onLoad();
    else
        window.addEventListener('load', onLoad, { once: true });
    return () => {
        channel === null || channel === void 0 ? void 0 : channel.close();
        window.removeEventListener('load', onLoad);
        window.removeEventListener('storage', onStorage);
    };
}
export async function broadcastSessionLogoutAndClearSwCaches() {
    if (Platform.OS !== 'web' || typeof window === 'undefined')
        return;
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel(SESSION_SYNC_CHANNEL);
            channel.postMessage({ type: 'SESSION_LOGOUT', timestamp: Date.now() });
            channel.close();
        }
        catch {
            /* BroadcastChannel unavailable in this context */
        }
    }
    try {
        window.localStorage.setItem(SESSION_EVENT_KEY, JSON.stringify({ at: Date.now(), nonce: Math.random() }));
    }
    catch {
        /* Ignore */
    }
    // The worker stores public assets only. Keeping its bounded shell preserves offline logout.
}
