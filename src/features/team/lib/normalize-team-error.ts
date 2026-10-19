import { ApiError } from '@/shared/api';

export interface NormalizedTeamError {
  code: string;
  message: string;
  blockingBookingIds: string[];
  blockingCount: number;
  retryAfterSeconds?: number;
}

export function normalizeTeamError(error: unknown): NormalizedTeamError {
  if (error instanceof ApiError) {
    const data = (error.data as Record<string, any>) ?? {};
    const code = data.code || (error as any).code || 'UNKNOWN_ERROR';
    const message =
      data.message || data.error || error.message || 'Ocorreu um erro na operação.';
    const blockingBookingIds = Array.isArray(data.blockingBookingIds)
      ? data.blockingBookingIds
      : [];

    let retryAfterSeconds: number | undefined;
    if (typeof data.retryAfterSeconds === 'number') {
      retryAfterSeconds = data.retryAfterSeconds;
    } else if (code === 'RESEND_COOLDOWN') {
      const match = message.match(/(\d+)\s*segundos/i);
      if (match && match[1]) {
        retryAfterSeconds = parseInt(match[1], 10);
      }
    }

    return {
      code,
      message,
      blockingBookingIds,
      blockingCount: blockingBookingIds.length,
      retryAfterSeconds,
    };
  }

  if (error && typeof error === 'object') {
    const errObj = error as Record<string, any>;
    const responseData = errObj.response?.data ?? errObj.data ?? {};
    const code = responseData.code || errObj.code || 'UNKNOWN_ERROR';
    const message =
      responseData.message ||
      responseData.error ||
      errObj.message ||
      'Ocorreu um erro na operação.';
    const blockingBookingIds = Array.isArray(responseData.blockingBookingIds)
      ? responseData.blockingBookingIds
      : [];

    let retryAfterSeconds: number | undefined;
    if (typeof responseData.retryAfterSeconds === 'number') {
      retryAfterSeconds = responseData.retryAfterSeconds;
    }

    return {
      code,
      message,
      blockingBookingIds,
      blockingCount: blockingBookingIds.length,
      retryAfterSeconds,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error ?? 'Ocorreu um erro inesperado.'),
    blockingBookingIds: [],
    blockingCount: 0,
  };
}
