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
      if (
        isExpired &&
        (parsed.payload !== undefined || parsed.result !== undefined || parsed.errorMessage !== undefined)
      ) {
        const opaqueRef: OperationAttemptRecord = {
          actorId: parsed.actorId,
          requestId: parsed.requestId,
          operation: parsed.operation,
          resourceKind: parsed.resourceKind,
          resourceId: parsed.resourceId ?? parsed.result?.resource?.id ?? null,
          originScope: parsed.originScope,
          status: parsed.status,
          createdAt: parsed.createdAt,
        };
        await AsyncStorage.setItem(key, JSON.stringify(opaqueRef));
        return opaqueRef;
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
      resourceId: attempt.resourceId ?? attempt.result?.resource?.id ?? null,
      originScope: attempt.originScope,
      status: attempt.status,
      createdAt: attempt.createdAt || Date.now(),
      errorMessage: attempt.errorMessage ?? null,
    };

    if (attempt.result) {
      const rawResult = attempt.result;
      sanitizedAttempt.result = {
        state: rawResult.state,
        operation: rawResult.operation,
        accessChanged: rawResult.accessChanged ?? false,
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
        const cleanPayload: Record<string, any> = {
          schemaVersion: p.schemaVersion, action: p.action, bookingId: p.bookingId, expectedVersion: p.expectedVersion, referenceOnly: p.referenceOnly,
          serviceIds: Array.isArray(p.serviceIds)
            ? [...p.serviceIds]
            : p.serviceId
            ? [p.serviceId]
            : [],
        };
        if (p.barbermanId !== undefined) cleanPayload.barbermanId = p.barbermanId;
        if (p.date !== undefined) cleanPayload.date = p.date;
        if (p.startTime !== undefined) cleanPayload.startTime = p.startTime;
        if (p.endTime !== undefined) cleanPayload.endTime = p.endTime;
        if (p.slotStartAt !== undefined) cleanPayload.slotStartAt = p.slotStartAt;
        if (p.expectedTotalPriceInCents !== undefined) cleanPayload.expectedTotalPriceInCents = p.expectedTotalPriceInCents;
        if (p.expectedDurationInMinutes !== undefined) cleanPayload.expectedDurationInMinutes = p.expectedDurationInMinutes;
        if (p.scope !== undefined) cleanPayload.scope = p.scope;
        if (p.shopId !== undefined) cleanPayload.shopId = p.shopId;
        if (p.customerId !== undefined) cleanPayload.customerId = p.customerId;
        sanitizedAttempt.payload = cleanPayload;
      } else if (
        attempt.resourceKind === 'REGISTRATION' ||
        attempt.resourceKind === 'INVITATION' ||
        attempt.resourceKind === 'SCHEDULE' ||
        attempt.resourceKind === 'LOCATION'
      ) {
        sanitizedAttempt.payload = undefined;
      } else {
        const payloadCopy = JSON.parse(JSON.stringify(attempt.payload));
        if (payloadCopy && typeof payloadCopy === 'object') {
          delete (payloadCopy as any).password;
          delete (payloadCopy as any).token;
          delete (payloadCopy as any).refreshToken;
          delete (payloadCopy as any).accessToken;
          delete (payloadCopy as any).cpf;
          delete (payloadCopy as any).email;
        }
        sanitizedAttempt.payload = payloadCopy;
      }
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
                resourceId: parsed.resourceId ?? parsed.result?.resource?.id ?? null,
                originScope: parsed.originScope,
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
          } catch (error) {
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
            const opaqueRef: OperationAttemptRecord = {
              actorId: parsed.actorId,
              requestId: parsed.requestId,
              operation: parsed.operation,
              resourceKind: parsed.resourceKind,
              resourceId: parsed.resourceId ?? parsed.result?.resource?.id ?? null,
              originScope: parsed.originScope,
              status: parsed.status,
              createdAt: parsed.createdAt,
            };
            await AsyncStorage.setItem(key, JSON.stringify(opaqueRef));
          } catch (error) {
            // A failed write must not erase the only reference to a possibly committed operation.
            throw error;
          }
        }
      }
    } catch (error) { throw error; }
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
export const operationAttemptStore: OperationAttemptStore = new NativeOperationAttemptStore();
export function createOperationAttemptStore(): OperationAttemptStore { return new NativeOperationAttemptStore(); }
