import * as SecureStore from 'expo-secure-store';
import type { SessionPersistence, StoredSession } from './session-storage';

const SECURE_STORE_KEY = 'smartbarber_native_session';
const LOGOUT_PENDING_KEY = 'smartbarber_native_logout_pending';

export class NativeSessionStorage implements SessionPersistence {
  async read(): Promise<StoredSession | null> {
    const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async save(record: StoredSession): Promise<void> {
    const serialized = JSON.stringify(record);
    await SecureStore.setItemAsync(SECURE_STORE_KEY, serialized);
    await SecureStore.deleteItemAsync(LOGOUT_PENDING_KEY).catch(() => {});
  }

  async markLogoutPending(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY).catch(() => {});
    await SecureStore.setItemAsync(LOGOUT_PENDING_KEY, 'true');
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(LOGOUT_PENDING_KEY).catch(() => {});
  }

  async isLogoutPending(): Promise<boolean> {
    const val = await SecureStore.getItemAsync(LOGOUT_PENDING_KEY).catch(() => null);
    return val === 'true';
  }
}
