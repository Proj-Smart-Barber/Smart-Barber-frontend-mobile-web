import type { SessionPersistence, StoredSession } from './session-storage';

const STORAGE_KEY = 'smartbarber_session_hint';
const LOGOUT_PENDING_KEY = 'smartbarber_logout_pending';

export class WebSessionStorage implements SessionPersistence {
  private inMemory: Map<string, string> = new Map();

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  async read(): Promise<StoredSession | null> {
    try {
      const storage = this.getStorage();
      const raw = storage ? storage.getItem(STORAGE_KEY) : this.inMemory.get(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Web never stores or exposes secrets
      return {
        hasSession: parsed.hasSession ?? true,
        accessToken: parsed.accessToken ?? null,
        accessExpiresAt: parsed.accessExpiresAt ?? null,
        accountTypeHint: parsed.accountTypeHint ?? null,
        selectedShopId: parsed.selectedShopId ?? null,
      };
    } catch {
      return null;
    }
  }

  async save(record: StoredSession): Promise<void> {
    const storage = this.getStorage();
    // Do NOT store refreshToken in web JS storage
    const sanitized = {
      hasSession: true,
      accessToken: record.accessToken ?? null,
      accessExpiresAt: record.accessExpiresAt ?? null,
      accountTypeHint: record.accountTypeHint ?? null,
      selectedShopId: record.selectedShopId ?? null,
    };
    const serialized = JSON.stringify(sanitized);
    if (storage) {
      storage.setItem(STORAGE_KEY, serialized);
      storage.removeItem(LOGOUT_PENDING_KEY);
    } else {
      this.inMemory.set(STORAGE_KEY, serialized);
      this.inMemory.delete(LOGOUT_PENDING_KEY);
    }
  }

  async markLogoutPending(): Promise<void> {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEY);
      storage.setItem(LOGOUT_PENDING_KEY, 'true');
    } else {
      this.inMemory.delete(STORAGE_KEY);
      this.inMemory.set(LOGOUT_PENDING_KEY, 'true');
    }
  }

  async clear(): Promise<void> {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem(LOGOUT_PENDING_KEY);
    } else {
      this.inMemory.delete(STORAGE_KEY);
      this.inMemory.delete(LOGOUT_PENDING_KEY);
    }
  }

  async isLogoutPending(): Promise<boolean> {
    const storage = this.getStorage();
    const val = storage ? storage.getItem(LOGOUT_PENDING_KEY) : this.inMemory.get(LOGOUT_PENDING_KEY);
    return val === 'true';
  }
}
