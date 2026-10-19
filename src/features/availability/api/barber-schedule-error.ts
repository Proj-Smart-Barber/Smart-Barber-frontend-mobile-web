export type ScheduleWriteState = 'rejected' | 'saved' | 'unknown';
export type ScheduleErrorDetail = { dayOfWeek?: string; field?: string; reason?: string };
export type ScheduleBookingConflict = {
  bookingId: string; barbermanId: string; date: string; startTime: string; endTime: string;
};

/** Distinguishes a rejected write from a confirmed write whose reread failed. */
export class BarberScheduleError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly writeState: ScheduleWriteState = 'rejected',
    readonly details: ScheduleErrorDetail[] = [],
    readonly conflicts: ScheduleBookingConflict[] = [],
  ) { super(message); }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function normalizeBarberScheduleError(error: unknown, duringWrite = false) {
  if (error instanceof BarberScheduleError) return error;
  const raw = record(error);
  if (typeof raw.status === 'number') {
    const data = record(raw.data);
    const nested = record(data.error);
    const issues = Array.isArray(data.errors) ? data.errors.map(record) : [];
    const details: ScheduleErrorDetail[] = issues.map(issue => {
      const path = Array.isArray(issue.path) ? issue.path : [];
      const field = path[0] === 'schedules' && Number.isInteger(path[1]) &&
        Number(path[1]) >= 0 && (path[2] === 'openTime' || path[2] === 'closeTime')
        ? `schedules[${path[1]}].${path[2]}` : undefined;
      return { field, reason: text(issue.message) };
    });
    if (Array.isArray(nested.details)) {
      details.push(...nested.details.map(value => {
        const detail = record(value);
        return { dayOfWeek: text(detail.dayOfWeek), field: text(detail.field), reason: text(detail.reason) };
      }));
    }
    // Keep only the contract fields; never propagate arbitrary customer data.
    const conflicts: ScheduleBookingConflict[] = [];
    if (Array.isArray(data.conflicts)) {
      for (const value of data.conflicts) {
        const conflict = record(value);
        const bookingId = text(conflict.bookingId);
        const barbermanId = text(conflict.barbermanId);
        const date = text(conflict.date);
        const startTime = text(conflict.startTime);
        const endTime = text(conflict.endTime);
        if (bookingId && barbermanId && date && startTime && endTime) {
          conflicts.push({ bookingId, barbermanId, date, startTime, endTime });
        }
      }
    }
    const messages: Record<number, string> = {
      400: 'Revise os horários informados e o funcionamento da unidade.',
      401: 'Sua sessão expirou. Entre novamente para continuar.',
      403: 'Você não tem autorização para alterar a jornada nesta unidade.',
      409: 'A alteração conflita com uma reserva. Revise os períodos informados.',
      422: 'Revise os horários informados e o funcionamento da unidade.',
    };
    const code = text(data.code) ?? text(nested.code) ?? 'SCHEDULE_ERROR';
    const serverMessage = text(issues[0]?.message) ?? text(data.error) ??
      text(data.message) ?? text(nested.message);
    const message = raw.status === 401 || raw.status === 403 ? messages[raw.status] :
      raw.status === 409 && code === 'SCHEDULE_BOOKING_CONFLICT'
        ? 'A alteração conflita com reservas existentes. Ajuste os períodos para manter esses atendimentos.'
        : serverMessage ?? messages[raw.status] ?? 'Não foi possível concluir a operação. Tente novamente.';
    return new BarberScheduleError(message, raw.status, code,
      duringWrite && (raw.isNetworkError === true || raw.status === 0) ? 'unknown' : 'rejected',
      details, conflicts);
  }
  return new BarberScheduleError(
    'Não foi possível carregar a jornada. Verifique sua conexão e tente novamente.',
    0, 'NETWORK_ERROR', duringWrite ? 'unknown' : 'rejected',
  );
}
