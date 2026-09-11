/**
 * Adapter HTTP da Disponibilidade.
 *
 * Compatível com a branch de backend `feat/availability-engine` recebida em
 * 2026-09-11. O backend atual expõe as rotas abaixo sob `/api`:
 *
 *   GET    /barbershops/:shopId/schedules
 *   PUT    /barbershops/:shopId/schedules
 *   GET    /barbershops/:shopId/schedule-exceptions
 *   POST   /barbershops/:shopId/schedule-exceptions
 *   PATCH  /barbershops/:shopId/schedule-exceptions/:exceptionId
 *   DELETE /barbershops/:shopId/schedule-exceptions/:exceptionId
 *   GET    /barbershops/:shopId/availability?date=&serviceIds=&barbermanId=
 *
 * Observações de compatibilidade importantes:
 * - PUT /schedules recebe UMA entrada por requisição; por isso o adapter envia
 *   uma requisição para cada intervalo do formulário.
 * - O backend atual retorna listas vazias nos GETs de jornada/exceções. O
 *   adapter mantém um espelho em memória durante a sessão para que a UI não
 *   perca imediatamente o que acabou de salvar.
 * - Não existe GET /barbershops/:id nesta branch. Nome/timezone vêm de config
 *   pública do frontend até o backend publicar esse recurso.
 * - PATCH de exceção do backend atual responde sucesso, mas não persiste a
 *   alteração. Quando o item existe no espelho local, o adapter implementa a
 *   edição como DELETE + POST, usando apenas endpoints reais já existentes.
 */
import { httpClient } from '@/shared/api';
import { ENV } from '@/shared/config/env';
import type { Barbershop } from '@/entities/barbershop';
import type {
  AvailabilityException,
  AvailabilitySlot,
  IAvailabilityRepository,
  WeeklyScheduleEntry,
  Weekday,
} from './availability.contract';
import type {
  BackendAvailabilityResponseDto,
  BackendCreateExceptionRequestDto,
  BackendCreateExceptionResponseDto,
  BackendExceptionListResponseDto,
  BackendScheduleListResponseDto,
  BackendUpdateScheduleRequestDto,
  BackendUpdateScheduleResponseDto,
} from './availability.backend.dto';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS: readonly Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'string' && (WEEKDAYS as readonly string[]).includes(value);
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function scopeKey(barbershopId: string, barbermanId?: string | null): string {
  return `${barbershopId}::${barbermanId ?? 'general'}`;
}

function normalizeBackendScheduleItem(item: unknown): WeeklyScheduleEntry | null {
  if (!item || typeof item !== 'object') return null;

  const raw = item as Record<string, unknown>;
  const id = raw.id ?? raw.scheduleId ?? raw.schedule_id;
  const weekday = raw.dayOfWeek ?? raw.day_of_week;
  const barbermanId = raw.barbermanId ?? raw.barberman_id ?? null;
  const openTime = raw.openTime ?? raw.open_time;
  const closeTime = raw.closeTime ?? raw.close_time;

  if (typeof id !== 'string' || !isWeekday(weekday) || !isTime(openTime) || !isTime(closeTime)) {
    return null;
  }

  return {
    id,
    weekday,
    barbermanId: typeof barbermanId === 'string' ? barbermanId : null,
    range: { start: openTime, end: closeTime },
  };
}

function normalizeBackendExceptionItem(item: unknown): AvailabilityException | null {
  if (!item || typeof item !== 'object') return null;

  const raw = item as Record<string, unknown>;
  const id = raw.id ?? raw.exceptionId ?? raw.exception_id;
  const date = raw.date;
  const barbermanId = raw.barbermanId ?? raw.barberman_id ?? null;
  const startTime = raw.startTime ?? raw.start_time ?? raw.openTime ?? raw.open_time ?? null;
  const endTime = raw.endTime ?? raw.end_time ?? raw.closeTime ?? raw.close_time ?? null;
  const reason = raw.reason ?? null;

  if (typeof id !== 'string' || typeof date !== 'string') return null;

  return {
    id,
    date: date.slice(0, 10),
    barbermanId: typeof barbermanId === 'string' ? barbermanId : null,
    openTime: isTime(startTime) ? startTime : null,
    closeTime: isTime(endTime) ? endTime : null,
    reason: typeof reason === 'string' && reason.length > 0 ? reason : null,
  };
}

export class AvailabilityHttpAdapter implements IAvailabilityRepository {
  private readonly scheduleMirror = new Map<string, WeeklyScheduleEntry[]>();
  private readonly exceptionMirror = new Map<string, AvailabilityException[]>();

  async getBarbershop(barbershopId: string): Promise<Barbershop> {
    // A branch atual do backend não expõe GET /barbershops/:id.
    // Mantemos a informação configurável no frontend para não inventar uma
    // chamada HTTP inexistente nem tocar no backend.
    return {
      id: barbershopId,
      name: ENV.BARBERSHOP_NAME,
      timezone: ENV.BARBERSHOP_TIMEZONE,
    };
  }

  async getWeeklySchedule(
    barbershopId: string,
    barbermanId?: string,
  ): Promise<WeeklyScheduleEntry[]> {
    const response = await httpClient.get<BackendScheduleListResponseDto>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/schedules`,
      {
        params: barbermanId ? { barbermanId } : undefined,
      },
    );

    const fromServer = Array.isArray(response?.schedules)
      ? response.schedules
          .map(normalizeBackendScheduleItem)
          .filter((entry): entry is WeeklyScheduleEntry => entry !== null)
      : [];

    const key = scopeKey(barbershopId, barbermanId);

    if (fromServer.length > 0) {
      this.scheduleMirror.set(key, fromServer);
      return fromServer;
    }

    // O GET atual devolve { schedules: [] } de forma fixa. Depois de um save,
    // preservar o espelho evita apagar a UI por causa desse mock de leitura.
    return this.scheduleMirror.get(key) ?? [];
  }

  async saveWeeklySchedule(
    barbershopId: string,
    entries: Omit<WeeklyScheduleEntry, 'id'>[],
  ): Promise<WeeklyScheduleEntry[]> {
    const saved: WeeklyScheduleEntry[] = [];

    for (const entry of entries) {
      const body: BackendUpdateScheduleRequestDto = {
        dayOfWeek: entry.weekday,
        openTime: entry.range.start,
        closeTime: entry.range.end,
        barbermanId: entry.barbermanId,
      };

      const response = await httpClient.put<BackendUpdateScheduleResponseDto>(
        `/api/barbershops/${encodeURIComponent(barbershopId)}/schedules`,
        body,
      );

      saved.push({
        id: response.scheduleId,
        ...entry,
      });
    }

    const barbermanId = entries[0]?.barbermanId ?? null;
    this.scheduleMirror.set(scopeKey(barbershopId, barbermanId), saved);

    return saved;
  }

  async listExceptions(
    barbershopId: string,
    barbermanId?: string,
  ): Promise<AvailabilityException[]> {
    const response = await httpClient.get<BackendExceptionListResponseDto>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions`,
      {
        params: barbermanId ? { barbermanId } : undefined,
      },
    );

    const fromServer = Array.isArray(response?.exceptions)
      ? response.exceptions
          .map(normalizeBackendExceptionItem)
          .filter((entry): entry is AvailabilityException => entry !== null)
      : [];

    const key = scopeKey(barbershopId, barbermanId);

    if (fromServer.length > 0) {
      this.exceptionMirror.set(key, fromServer);
      return fromServer;
    }

    return this.exceptionMirror.get(key) ?? [];
  }

  async createException(
    barbershopId: string,
    exception: Omit<AvailabilityException, 'id'>,
  ): Promise<AvailabilityException> {
    const body: BackendCreateExceptionRequestDto = {
      date: exception.date,
      barbermanId: exception.barbermanId,
      startTime: exception.openTime,
      endTime: exception.closeTime,
      reason: exception.reason,
    };

    const response = await httpClient.post<BackendCreateExceptionResponseDto>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions`,
      body,
    );

    const created: AvailabilityException = {
      id: response.exceptionId,
      ...exception,
    };

    const key = scopeKey(barbershopId, exception.barbermanId);
    const current = this.exceptionMirror.get(key) ?? [];
    this.exceptionMirror.set(key, [...current, created]);

    return created;
  }

  async updateException(
    barbershopId: string,
    exceptionId: string,
    exception: Partial<Omit<AvailabilityException, 'id'>>,
  ): Promise<AvailabilityException> {
    const candidateScopes = [...this.exceptionMirror.entries()];
    let current: AvailabilityException | undefined;

    for (const [, entries] of candidateScopes) {
      current = entries.find((item) => item.id === exceptionId);
      if (current) break;
    }

    if (!current) {
      throw new Error(
        'Não foi possível editar esta exceção porque o backend atual não retorna os dados completos no GET. Recarregue a tela e crie a exceção novamente.',
      );
    }

    const merged: Omit<AvailabilityException, 'id'> = {
      date: exception.date ?? current.date,
      barbermanId: exception.barbermanId !== undefined ? exception.barbermanId : current.barbermanId,
      openTime: exception.openTime !== undefined ? exception.openTime : current.openTime,
      closeTime: exception.closeTime !== undefined ? exception.closeTime : current.closeTime,
      reason: exception.reason !== undefined ? exception.reason : current.reason,
    };

    // O PATCH atual é apenas um sucesso genérico e não altera o repositório.
    // DELETE + POST é a única forma de efetivar a edição sem tocar no backend.
    await this.removeException(barbershopId, exceptionId);
    return this.createException(barbershopId, merged);
  }

  async removeException(barbershopId: string, exceptionId: string): Promise<void> {
    await httpClient.delete<void>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`,
    );

    for (const [key, entries] of this.exceptionMirror.entries()) {
      const next = entries.filter((entry) => entry.id !== exceptionId);
      if (next.length !== entries.length) {
        this.exceptionMirror.set(key, next);
      }
    }
  }

  async getCalculatedAvailability(
    barbershopId: string,
    params: { serviceIds: string[]; date: string; barbermanId?: string },
  ): Promise<AvailabilitySlot[]> {
    const response = await httpClient.get<BackendAvailabilityResponseDto>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/availability`,
      {
        params: {
          date: params.date,
          serviceIds: params.serviceIds.join(','),
          barbermanId: params.barbermanId,
        },
      },
    );

    if (!Array.isArray(response?.slots)) return [];

    return response.slots
      .filter(
        (slot): slot is { start: string; end: string } =>
          !!slot && typeof slot.start === 'string' && typeof slot.end === 'string',
      )
      .map((slot) => ({ start: slot.start, end: slot.end }));
  }
}
