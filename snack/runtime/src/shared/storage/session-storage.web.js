const STORAGE_KEY = 'smartbarber_session_hint';
const LOGOUT_PENDING_KEY = 'smartbarber_logout_pending';
export class WebSessionStorage {
    constructor() {
        this.inMemory = new Map();
    }
    getStorage() {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
        return null;
    }
    async read() {
        var _a, _b, _c, _d;
        try {
            const storage = this.getStorage();
            const raw = storage ? storage.getItem(STORAGE_KEY) : this.inMemory.get(STORAGE_KEY);
            if (!raw)
                return null;
            const parsed = JSON.parse(raw);
            // Web never stores or exposes secrets
            return {
                hasSession: (_a = parsed.hasSession) !== null && _a !== void 0 ? _a : true,
                accessToken: null,
                accessExpiresAt: (_b = parsed.accessExpiresAt) !== null && _b !== void 0 ? _b : null,
                accountTypeHint: (_c = parsed.accountTypeHint) !== null && _c !== void 0 ? _c : null,
                selectedShopId: (_d = parsed.selectedShopId) !== null && _d !== void 0 ? _d : null,
            };
        }
        catch {
            return null;
        }
    }
    async save(record) {
        var _a, _b, _c;
        const storage = this.getStorage();
        // Access stays in memory; refresh stays in the server's HttpOnly cookie.
        const sanitized = {
            hasSession: true,
            accessExpiresAt: (_a = record.accessExpiresAt) !== null && _a !== void 0 ? _a : null,
            accountTypeHint: (_b = record.accountTypeHint) !== null && _b !== void 0 ? _b : null,
            selectedShopId: (_c = record.selectedShopId) !== null && _c !== void 0 ? _c : null,
        };
        const serialized = JSON.stringify(sanitized);
        if (storage) {
            storage.setItem(STORAGE_KEY, serialized);
            storage.removeItem(LOGOUT_PENDING_KEY);
        }
        else {
            this.inMemory.set(STORAGE_KEY, serialized);
            this.inMemory.delete(LOGOUT_PENDING_KEY);
        }
    }
    async markLogoutPending() {
        const storage = this.getStorage();
        if (storage) {
            storage.removeItem(STORAGE_KEY);
            storage.setItem(LOGOUT_PENDING_KEY, 'true');
        }
        else {
            this.inMemory.delete(STORAGE_KEY);
            this.inMemory.set(LOGOUT_PENDING_KEY, 'true');
        }
    }
    async clear() {
        const storage = this.getStorage();
        if (storage) {
            storage.removeItem(STORAGE_KEY);
            storage.removeItem(LOGOUT_PENDING_KEY);
        }
        else {
            this.inMemory.delete(STORAGE_KEY);
            this.inMemory.delete(LOGOUT_PENDING_KEY);
        }
    }
    async isLogoutPending() {
        const storage = this.getStorage();
        const val = storage ? storage.getItem(LOGOUT_PENDING_KEY) : this.inMemory.get(LOGOUT_PENDING_KEY);
        return val === 'true';
    }
}
