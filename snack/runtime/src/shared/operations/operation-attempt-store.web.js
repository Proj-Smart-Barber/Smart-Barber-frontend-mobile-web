const STORAGE_PREFIX = 'sb_ops_';
const TTL_24H_MS = 24 * 60 * 60 * 1000;
function buildStorageKey(actorId, requestId) {
    return `${STORAGE_PREFIX}${actorId}_${requestId}`;
}
export class WebOperationAttemptStore {
    constructor() {
        this.inMemory = new Map();
    }
    getStorage() {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage;
        }
        return null;
    }
    getItem(key) {
        var _a;
        const storage = this.getStorage();
        if (storage)
            return storage.getItem(key);
        return (_a = this.inMemory.get(key)) !== null && _a !== void 0 ? _a : null;
    }
    setItem(key, value) {
        const storage = this.getStorage();
        if (storage) {
            storage.setItem(key, value);
        }
        else {
            this.inMemory.set(key, value);
        }
    }
    removeItem(key) {
        const storage = this.getStorage();
        if (storage) {
            storage.removeItem(key);
        }
        else {
            this.inMemory.delete(key);
        }
    }
    getAllKeys() {
        const storage = this.getStorage();
        if (storage) {
            const keys = [];
            for (let i = 0; i < storage.length; i++) {
                const k = storage.key(i);
                if (k)
                    keys.push(k);
            }
            return keys;
        }
        return Array.from(this.inMemory.keys());
    }
    async read(actorId, requestId) {
        var _a, _b, _c, _d;
        if (!actorId || !requestId)
            return null;
        const key = buildStorageKey(actorId, requestId);
        const raw = this.getItem(key);
        if (!raw)
            return null;
        try {
            const parsed = JSON.parse(raw);
            if (!parsed ||
                typeof parsed !== 'object' ||
                parsed.actorId !== actorId ||
                parsed.requestId !== requestId) {
                return null;
            }
            // Janela de 24h: se passou do tempo, purgar payload, resultado e salvar apenas referência opaca
            const isExpired = Date.now() - (parsed.createdAt || 0) > TTL_24H_MS;
            if (isExpired &&
                (parsed.payload !== undefined || parsed.result !== undefined || parsed.errorMessage !== undefined)) {
                const opaqueRef = {
                    actorId: parsed.actorId,
                    requestId: parsed.requestId,
                    operation: parsed.operation,
                    resourceKind: parsed.resourceKind,
                    resourceId: (_d = (_a = parsed.resourceId) !== null && _a !== void 0 ? _a : (_c = (_b = parsed.result) === null || _b === void 0 ? void 0 : _b.resource) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null,
                    originScope: parsed.originScope,
                    status: parsed.status,
                    createdAt: parsed.createdAt,
                };
                this.setItem(key, JSON.stringify(opaqueRef));
                return opaqueRef;
            }
            return parsed;
        }
        catch {
            // Falha fechado para dados corrompidos
            return null;
        }
    }
    async save(actorId, attempt) {
        var _a, _b, _c, _d, _e, _f;
        if (!actorId || !attempt.requestId) {
            throw new Error('actorId e requestId são obrigatórios para gravar tentativa.');
        }
        const key = buildStorageKey(actorId, attempt.requestId);
        const sanitizedAttempt = {
            actorId,
            requestId: attempt.requestId,
            operation: attempt.operation,
            resourceKind: attempt.resourceKind,
            resourceId: (_d = (_a = attempt.resourceId) !== null && _a !== void 0 ? _a : (_c = (_b = attempt.result) === null || _b === void 0 ? void 0 : _b.resource) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null,
            originScope: attempt.originScope,
            status: attempt.status,
            createdAt: attempt.createdAt || Date.now(),
            errorMessage: (_e = attempt.errorMessage) !== null && _e !== void 0 ? _e : null,
        };
        if (attempt.result) {
            const rawResult = attempt.result;
            sanitizedAttempt.result = {
                state: rawResult.state,
                operation: rawResult.operation,
                accessChanged: (_f = rawResult.accessChanged) !== null && _f !== void 0 ? _f : false,
                serverTime: rawResult.serverTime,
            };
            if (rawResult.resource) {
                sanitizedAttempt.result.resource = {
                    kind: rawResult.resource.kind,
                    id: rawResult.resource.id,
                    version: rawResult.resource.version,
                };
            }
        }
        const isExpired = Date.now() - sanitizedAttempt.createdAt > TTL_24H_MS;
        if (!isExpired && attempt.payload !== undefined && attempt.payload !== null) {
            if (attempt.resourceKind === 'BOOKING') {
                const p = attempt.payload;
                const cleanPayload = {
                    schemaVersion: p.schemaVersion, action: p.action, bookingId: p.bookingId, expectedVersion: p.expectedVersion, referenceOnly: p.referenceOnly,
                    serviceIds: Array.isArray(p.serviceIds)
                        ? [...p.serviceIds]
                        : p.serviceId
                            ? [p.serviceId]
                            : [],
                };
                if (p.barbermanId !== undefined)
                    cleanPayload.barbermanId = p.barbermanId;
                if (p.date !== undefined)
                    cleanPayload.date = p.date;
                if (p.startTime !== undefined)
                    cleanPayload.startTime = p.startTime;
                if (p.endTime !== undefined)
                    cleanPayload.endTime = p.endTime;
                if (p.slotStartAt !== undefined)
                    cleanPayload.slotStartAt = p.slotStartAt;
                if (p.expectedTotalPriceInCents !== undefined)
                    cleanPayload.expectedTotalPriceInCents = p.expectedTotalPriceInCents;
                if (p.expectedDurationInMinutes !== undefined)
                    cleanPayload.expectedDurationInMinutes = p.expectedDurationInMinutes;
                if (p.scope !== undefined)
                    cleanPayload.scope = p.scope;
                if (p.shopId !== undefined)
                    cleanPayload.shopId = p.shopId;
                if (p.customerId !== undefined)
                    cleanPayload.customerId = p.customerId;
                sanitizedAttempt.payload = cleanPayload;
            }
            else if (attempt.resourceKind === 'REGISTRATION' ||
                attempt.resourceKind === 'INVITATION' ||
                attempt.resourceKind === 'SCHEDULE' ||
                attempt.resourceKind === 'LOCATION') {
                sanitizedAttempt.payload = undefined;
            }
            else {
                const payloadCopy = JSON.parse(JSON.stringify(attempt.payload));
                if (payloadCopy && typeof payloadCopy === 'object') {
                    delete payloadCopy.password;
                    delete payloadCopy.token;
                    delete payloadCopy.refreshToken;
                    delete payloadCopy.accessToken;
                    delete payloadCopy.cpf;
                    delete payloadCopy.email;
                }
                sanitizedAttempt.payload = payloadCopy;
            }
        }
        try {
            this.setItem(key, JSON.stringify(sanitizedAttempt));
        }
        catch (err) {
            throw new Error(`Falha ao persistir tentativa no storage: ${String(err)}`);
        }
    }
    async listReferences(actorId) {
        var _a, _b, _c, _d;
        if (!actorId)
            return [];
        const prefix = `${STORAGE_PREFIX}${actorId}_`;
        const references = [];
        const keys = this.getAllKeys();
        for (const key of keys) {
            if (key.startsWith(prefix)) {
                const raw = this.getItem(key);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed && parsed.actorId === actorId && parsed.requestId) {
                            references.push({
                                actorId: parsed.actorId,
                                requestId: parsed.requestId,
                                operation: parsed.operation,
                                resourceKind: parsed.resourceKind,
                                resourceId: (_d = (_a = parsed.resourceId) !== null && _a !== void 0 ? _a : (_c = (_b = parsed.result) === null || _b === void 0 ? void 0 : _b.resource) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null,
                                originScope: parsed.originScope,
                                status: parsed.status,
                                createdAt: parsed.createdAt,
                            });
                        }
                    }
                    catch {
                        // Ignora item inválido
                    }
                }
            }
        }
        return references;
    }
    async clearResolved(actorId) {
        if (!actorId)
            return;
        const prefix = `${STORAGE_PREFIX}${actorId}_`;
        const keys = this.getAllKeys();
        const keysToRemove = [];
        for (const key of keys) {
            if (key.startsWith(prefix)) {
                const raw = this.getItem(key);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed.status === 'confirmed') {
                            keysToRemove.push(key);
                        }
                    }
                    catch {
                        keysToRemove.push(key);
                    }
                }
            }
        }
        for (const key of keysToRemove) {
            this.removeItem(key);
        }
    }
    async clearPayloadsOnLogout(actorId) {
        var _a, _b, _c, _d;
        if (!actorId)
            return;
        const prefix = `${STORAGE_PREFIX}${actorId}_`;
        const keys = this.getAllKeys();
        const keysToRemove = [];
        const keysToSanitize = [];
        for (const key of keys) {
            if (key.startsWith(prefix)) {
                const raw = this.getItem(key);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed.status === 'confirmed') {
                            keysToRemove.push(key);
                        }
                        else {
                            // Incerta: preserva referência, expurga payload
                            keysToSanitize.push(key);
                        }
                    }
                    catch {
                        keysToRemove.push(key);
                    }
                }
            }
        }
        for (const key of keysToRemove) {
            this.removeItem(key);
        }
        for (const key of keysToSanitize) {
            const raw = this.getItem(key);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    const opaqueRef = {
                        actorId: parsed.actorId,
                        requestId: parsed.requestId,
                        operation: parsed.operation,
                        resourceKind: parsed.resourceKind,
                        resourceId: (_d = (_a = parsed.resourceId) !== null && _a !== void 0 ? _a : (_c = (_b = parsed.result) === null || _b === void 0 ? void 0 : _b.resource) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null,
                        originScope: parsed.originScope,
                        status: parsed.status,
                        createdAt: parsed.createdAt,
                    };
                    this.setItem(key, JSON.stringify(opaqueRef));
                }
                catch (error) {
                    throw error;
                }
            }
        }
    }
    async clearAllForActor(actorId) {
        if (!actorId)
            return;
        const prefix = `${STORAGE_PREFIX}${actorId}_`;
        const keys = this.getAllKeys();
        for (const key of keys) {
            if (key.startsWith(prefix)) {
                this.removeItem(key);
            }
        }
    }
}
// Metro selects this file directly on web; expose the same public entry point as the base module.
export const operationAttemptStore = new WebOperationAttemptStore();
export function createOperationAttemptStore() { return new WebOperationAttemptStore(); }
