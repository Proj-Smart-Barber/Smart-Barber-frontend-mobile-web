import AsyncStorage from '@react-native-async-storage/async-storage';
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

export class NativeOperationAttemptStore implements OperationAttemptStore {
  async read(actorId: string, requestId: string): Promise<OperationAttemptRecord | null> {
    if (!actorId || !requestId) return null;

    const key = buildStorageKey(actorId, requestId);
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const parsed: OperationAttemptRecord = JSON.parse(raw);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        parsed.actorId !== actorId ||
        parsed.requestId !== requestId
      ) {
        return null;
      }

      const isExpired = Date.now() - (parsed.createdAt || 0) > TTL_24H_MS;
      if (isExpired && parsed.payload !== undefined) {
        delete parsed.payload;
        await AsyncStorage.setItem(key, JSON.stringify(parsed));
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async save(actorId: string, attempt: OperationAttemptRecord): Promise<void> {
    if (!actorId || !attempt.requestId) {
      throw new Error('actorId e requestId são obrigatórios para gravar tentativa.');
    }

    const key = buildStorageKey(actorId, attempt.requestId);

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
      await AsyncStorage.setItem(key, JSON.stringify(sanitizedAttempt));
    } catch (err) {
      throw new Error(`Falha ao persistir tentativa no AsyncStorage: ${String(err)}`);
    }
  }

  async listReferences(actorId: string): Promise<OperationReference[]> {
    if (!actorId) return [];

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    const references: OperationReference[] = [];

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const actorKeys = allKeys.filter((k) => k.startsWith(prefix));

      for (const key of actorKeys) {
        const raw = await AsyncStorage.getItem(key);
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
    } catch {
      return [];
    }

    return references;
  }

  async clearResolved(actorId: string): Promise<void> {
    if (!actorId) return;

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const actorKeys = allKeys.filter((k) => k.startsWith(prefix));
      const keysToRemove: string[] = [];

      for (const key of actorKeys) {
        const raw = await AsyncStorage.getItem(key);
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

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch {
      // Ignora falhas de cleanup secundário
    }
  }

  async clearPayloadsOnLogout(actorId: string): Promise<void> {
    if (!actorId) return;

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const actorKeys = allKeys.filter((k) => k.startsWith(prefix));
      const keysToRemove: string[] = [];
      const keysToSanitize: string[] = [];

      for (const key of actorKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          try {
            const parsed: OperationAttemptRecord = JSON.parse(raw);
            if (parsed.status === 'confirmed') {
              keysToRemove.push(key);
            } else {
              keysToSanitize.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      for (const key of keysToSanitize) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          try {
            const parsed: OperationAttemptRecord = JSON.parse(raw);
            delete parsed.payload;
            await AsyncStorage.setItem(key, JSON.stringify(parsed));
          } catch {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch {
      // Falha fechado
    }
  }

  async clearAllForActor(actorId: string): Promise<void> {
    if (!actorId) return;

    const prefix = `${STORAGE_PREFIX}${actorId}_`;
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const actorKeys = allKeys.filter((k) => k.startsWith(prefix));
      if (actorKeys.length > 0) {
        await AsyncStorage.multiRemove(actorKeys);
      }
    } catch {
      // Falha fechado
    }
  }
}
