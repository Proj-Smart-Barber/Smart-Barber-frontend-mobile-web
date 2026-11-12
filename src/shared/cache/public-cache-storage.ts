import { Platform } from 'react-native';

export interface PublicCacheStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

async function webOperation<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  if (typeof indexedDB === 'undefined') return null;
  return new Promise((resolve) => {
    let db: IDBDatabase | undefined;
    let tx: IDBTransaction | undefined;
    let done = false;
    const finish = (value: T | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      db?.close();
      resolve(value);
    };
    const timer = setTimeout(() => {
      try {
        tx?.abort();
      } catch {}
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
    } catch {
      finish(null);
    }
  });
}

export const publicCacheStorage: PublicCacheStorage = {
  async getItem(key) {
    if (Platform.OS !== 'web')
      return (await import('@react-native-async-storage/async-storage')).default.getItem(key);
    return ((await webOperation('readonly', (store) => store.get(key))) ?? null) as string | null;
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
