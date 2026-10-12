import type {
  OperationAttemptRecord,
  OperationAttemptStore,
  OperationReference,
} from './operation-attempt.types';

const STORAGE_PREFIX = 'sb_ops_';
const TTL_24H_MS = 24 * 60 * 60 * 1000;

function buildStorageKey(actorId: string, requestId: string): string {
  return `${STORAGE_PREFIX}${actorId}_${requestId}`;
}

export class WebOperationAttemptStore implements OperationAttemptStore {
  private inMemory: Map<string, string> = new Map();

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  private getItem(key: string): string | null {
    const storage = this.getStorage();
    if (storage) return storage.getItem(key);
    return this.inMemory.get(key) ?? null;
  }

  private setItem(key: string, value: string): void {
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(key, value);
    } else {
      this.inMemory.set(key, value);
    }
  }

  private removeItem(key: string): void {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(key);
    } else {
      this.inMemory.delete(key);
    }
  }

  private getAllKeys(): string[] {
    const storage = this.getStorage();
    if (storage) {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    }
    return Array.from(this.inMemory.keys());
  }

  async read(actorId: string, requestId: string): Promise<OperationAttemptRecord | null> {
    if (!actorId || !requestId) return null;

    const key = buildStorageKey(actorId, requestId);
    const raw = this.getItem(key);
    if (!raw) return null;

    try {
      const parsed: OperationAttemptRecord = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        parsed.actorId !== actorId ||
        parsed.requestId !== requestId
      ) {
        return null;
      }

      // Janela de 24h: se passou do tempo, purgar payload e salvar apenas referência
      const isExpired = Date.now() - (parsed.createdAt || 0) > TTL_24H_MS;
      if (isExpired && parsed.payload !== undefined) {
        delete parsed.payload;
        this.setItem(key, JSON.stringify(parsed));
      }

      return parsed;
    } catch {
      // Falha fechado para dados corrompidos
      return null;
    }
  }

  async save(actorId: string, attempt: OperationAttemptRecord): Promise<void> {
    if (!actorId || !attempt.requestId) {
      throw new Error('actorId e requestId são obrigatórios para gravar tentativa.');
    }

    const key = buildStorageKey(actorId, attempt.requestId);

    // Sanitização rigorosa: garantir que não persista senhas ou tokens
    const sanitizedAttempt: OperationAttemptRecord = {
      actorId,
      requestId: attempt.requestId,
      operation: attempt.operation,
      resourceKind: attempt.resourceKind,
      status: attempt.status,
      createdAt: attempt.createdAt || Date.now(),
      errorMessage: attempt.errorMessage ?? null,
      result: attempt.result,
    };

    const isExpired = Date.now() - sanitizedAttempt.createdAt > TTL_24H_MS;
    if (!isExpired && attempt.payload !== undefined) {
      const payloadCopy = JSON.parse(JSON.stringify(attempt.payload));
      if (payloadCopy && typeof payloadCopy === 'object') {
        delete (payloadCopy as any).password;
        delete (payloadCopy as any).token;
        delete (payloadCopy as any).refreshToken;
        delete (payloadCopy as any).accessToken;
        delete (payloadCopy as any).cpf;
      }
      sanitizedAttempt.payload = payloadCopy;
    }

    try {
      this.setItem(key, JSON.stringify(sanitizedAttempt));
    } catch (err) {
      throw new Error(`Falha ao persistir tentativa no storage: ${String(err)}`);
    }
  }

  async listReferences(actorId: string): Promise<OperationReference[]> {
    if (!actorId) return [];

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    const references: OperationReference[] = [];
    const keys = this.getAllKeys();

    for (const key of keys) {
      if (key.startsWith(prefix)) {
        const raw = this.getItem(key);
        if (raw) {
          try {
            const parsed: OperationAttemptRecord = JSON.parse(raw);
            if (parsed && parsed.actorId === actorId && parsed.requestId) {
              references.push({
                actorId: parsed.actorId,
                requestId: parsed.requestId,
                operation: parsed.operation,
                resourceKind: parsed.resourceKind,
                status: parsed.status,
                createdAt: parsed.createdAt,
              });
            }
          } catch {
            // Ignora item inválido
          }
        }
      }
    }

    return references;
  }

  async clearResolved(actorId: string): Promise<void> {
    if (!actorId) return;

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    const keys = this.getAllKeys();
    const keysToRemove: string[] = [];

    for (const key of keys) {
      if (key.startsWith(prefix)) {
        const raw = this.getItem(key);
        if (raw) {
          try {
            const parsed: OperationAttemptRecord = JSON.parse(raw);
            if (parsed.status === 'confirmed') {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }

    for (const key of keysToRemove) {
      this.removeItem(key);
    }
  }

  async clearPayloadsOnLogout(actorId: string): Promise<void> {
    if (!actorId) return;

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    const keys = this.getAllKeys();
    const keysToRemove: string[] = [];
    const keysToSanitize: string[] = [];

    for (const key of keys) {
      if (key.startsWith(prefix)) {
        const raw = this.getItem(key);
        if (raw) {
          try {
            const parsed: OperationAttemptRecord = JSON.parse(raw);
            if (parsed.status === 'confirmed') {
              keysToRemove.push(key);
            } else {
              // Incerta: preserva referência, expurga payload
              keysToSanitize.push(key);
            }
          } catch {
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
          const parsed: OperationAttemptRecord = JSON.parse(raw);
          delete parsed.payload;
          this.setItem(key, JSON.stringify(parsed));
        } catch {
          this.removeItem(key);
        }
      }
    }
  }

  async clearAllForActor(actorId: string): Promise<void> {
    if (!actorId) return;

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    const keys = this.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.removeItem(key);
      }
    }
  }
}
