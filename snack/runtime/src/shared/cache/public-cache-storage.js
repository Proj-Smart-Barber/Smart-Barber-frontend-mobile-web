import { Platform } from 'react-native';
async function webOperation(mode, work) {
    if (typeof indexedDB === 'undefined')
        return null;
    return new Promise((resolve) => {
        let db;
        let tx;
        let done = false;
        const finish = (value) => {
            if (done)
                return;
            done = true;
            clearTimeout(timer);
            db === null || db === void 0 ? void 0 : db.close();
            resolve(value);
        };
        const timer = setTimeout(() => {
            try {
                tx === null || tx === void 0 ? void 0 : tx.abort();
            }
            catch { }
            finish(null);
        }, 1500);
        try {
            const opening = indexedDB.open('smartbarber-public-cache', 1);
            opening.onupgradeneeded = () => opening.result.createObjectStore('snapshots');
            opening.onerror = opening.onblocked = () => finish(null);
            opening.onsuccess = () => {
                db = opening.result;
                if (done) {
                    db.close();
                    return;
                }
                tx = db.transaction('snapshots', mode);
                const request = work(tx.objectStore('snapshots'));
                tx.oncomplete = () => finish(request.result);
                tx.onerror = tx.onabort = () => finish(null);
            };
        }
        catch {
            finish(null);
        }
    });
}
export const publicCacheStorage = {
    async getItem(key) {
        var _a;
        if (Platform.OS !== 'web')
            return (await import('@react-native-async-storage/async-storage')).default.getItem(key);
        return ((_a = (await webOperation('readonly', (store) => store.get(key)))) !== null && _a !== void 0 ? _a : null);
    },
    async setItem(key, value) {
        if (Platform.OS !== 'web') {
            await (await import('@react-native-async-storage/async-storage')).default.setItem(key, value);
            return;
        }
        if ((await webOperation('readwrite', (store) => store.put(value, key))) === null)
            throw new Error('Public cache unavailable');
    },
    async removeItem(key) {
        if (Platform.OS !== 'web') {
            await (await import('@react-native-async-storage/async-storage')).default.removeItem(key);
            return;
        }
        await webOperation('readwrite', (store) => store.delete(key));
    },
};
