export type ScheduleWriteState = 'rejected' | 'saved' | 'unknown';

/** Distinguishes a rejected write from a confirmed write whose reread failed. */
export class BarberScheduleError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly writeState: ScheduleWriteState = 'rejected',
    readonly details: { dayOfWeek?: string; field?: string; reason?: string }[] = [],
  ) { super(message); }
}

export function normalizeBarberScheduleError(error: unknown, duringWrite = false) {
  if (error instanceof BarberScheduleError) return error;
  if (error && typeof error === 'object' && 'status' in error) {
    const raw = error as { status: number; data?: { error?: { code?: string; message?: string;
      details?: BarberScheduleError['details'] } }; isNetworkError?: boolean };
    const messages: Record<number, string> = {
      401: 'Sua sessão expirou. Entre novamente para continuar.',
      403: 'Você não tem autorização para alterar a jornada nesta unidade.',
      409: 'A alteração conflita com uma reserva. Revise os períodos informados.',
      422: 'Revise os horários informados e o funcionamento da unidade.',
    };
    return new BarberScheduleError(raw.data?.error?.message ?? messages[raw.status] ??
      'Não foi possível concluir a operação. Tente novamente.', raw.status,
      raw.data?.error?.code ?? 'SCHEDULE_ERROR',
      duringWrite && (raw.isNetworkError || raw.status === 0) ? 'unknown' : 'rejected',
      raw.data?.error?.details ?? []);
  }
  return new BarberScheduleError(
    'Não foi possível carregar a jornada. Verifique sua conexão e tente novamente.',
    0, 'NETWORK_ERROR', duringWrite ? 'unknown' : 'rejected',
  );
}
