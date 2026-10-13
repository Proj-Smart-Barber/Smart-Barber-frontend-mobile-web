import { httpClient, ApiError } from '@/shared/api';
import type { OperationAttemptResult } from './operation-attempt.types';

const VALID_OPERATION_STATES = new Set<OperationAttemptResult['state']>([
  'PENDING',
  'APPLIED',
  'NOT_APPLIED',
  'UNKNOWN',
]);


function parseOperationState(rawState: unknown): OperationAttemptResult['state'] {
  if (typeof rawState === 'string' && VALID_OPERATION_STATES.has(rawState as any)) {
    return rawState as OperationAttemptResult['state'];
  }
  return 'UNKNOWN';
}

function parseServerTime(rawTime: unknown): string | undefined {
  if (typeof rawTime === 'string' && rawTime.trim() !== '') {
    return rawTime;
  }
  return undefined;
}

export async function findOwnAttempt(requestId: string): Promise<OperationAttemptResult> {
  if (!requestId) {
    throw new Error('requestId é obrigatório para consultar tentativa de operação.');
  }

  try {
    const raw = await httpClient.get<any>(
      `/api/operation-attempts/${encodeURIComponent(requestId)}`
    );

    const state = parseOperationState(raw?.state ?? raw?.attempt?.state);
    const operation = raw?.operation ?? raw?.attempt?.operation;
    const resource = raw?.resource ?? raw?.attempt?.resource;
    const accessChanged = raw?.accessChanged ?? raw?.attempt?.accessChanged ?? false;
    const serverTime = parseServerTime(raw?.serverTime ?? raw?.attempt?.serverTime);

    return {
      state,
      operation,
      resource,
      accessChanged,
      serverTime,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // 404 é estritamente UNKNOWN, nunca prova de NOT_APPLIED nem tempo autoritativo inventado
      return {
        state: 'UNKNOWN',
      };
    }
    throw err;
  }
}

export async function closeOwnAttempt(requestId: string): Promise<OperationAttemptResult> {
  if (!requestId) {
    throw new Error('requestId é obrigatório para encerrar tentativa de operação.');
  }

  const raw = await httpClient.post<any>(
    `/api/operation-attempts/${encodeURIComponent(requestId)}/close`
  );

  const state = parseOperationState(raw?.state);
  const operation = raw?.operation ?? 'CLOSED';
  const resource = raw?.resource;
  const accessChanged = raw?.accessChanged ?? false;
  const serverTime = parseServerTime(raw?.serverTime);

  return {
    state,
    operation,
    resource,
    accessChanged,
    serverTime,
  };
}

