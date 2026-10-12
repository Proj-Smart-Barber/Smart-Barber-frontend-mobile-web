import { httpClient, ApiError } from '@/shared/api';
import type { OperationAttemptResult } from './operation-attempt.types';

export async function findOwnAttempt(requestId: string): Promise<OperationAttemptResult> {
  if (!requestId) {
    throw new Error('requestId é obrigatório para consultar tentativa de operação.');
  }

  try {
    const raw = await httpClient.get<any>(
      `/api/operation-attempts/${encodeURIComponent(requestId)}`
    );

    // O controller devolve ok({ ...attempt, attempt }). Normalizamos para OperationAttemptResult
    const state = (raw?.state ?? raw?.attempt?.state ?? 'UNKNOWN') as OperationAttemptResult['state'];
    const operation = raw?.operation ?? raw?.attempt?.operation;
    const resource = raw?.resource ?? raw?.attempt?.resource;
    const accessChanged = raw?.accessChanged ?? raw?.attempt?.accessChanged ?? false;
    const serverTime = raw?.serverTime ?? raw?.attempt?.serverTime ?? new Date().toISOString();

    return {
      state,
      operation,
      resource,
      accessChanged,
      serverTime,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // 404 é estritamente UNKNOWN, nunca prova de NOT_APPLIED
      return {
        state: 'UNKNOWN',
        serverTime: new Date().toISOString(),
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

  const state = (raw?.state ?? 'NOT_APPLIED') as OperationAttemptResult['state'];
  const operation = raw?.operation ?? 'CLOSED';
  const resource = raw?.resource;
  const accessChanged = raw?.accessChanged ?? false;
  const serverTime = raw?.serverTime ?? new Date().toISOString();

  return {
    state,
    operation,
    resource,
    accessChanged,
    serverTime,
  };
}
