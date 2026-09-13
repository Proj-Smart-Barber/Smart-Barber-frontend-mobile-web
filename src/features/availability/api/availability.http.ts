/**
 * Adapter HTTP da Disponibilidade.
 *
 * Auditada contra o ZIP real do backend `feat/availability-engine` em
 * 2026-09-13. A UI/domínio continua independente dos detalhes de transporte.
 */
import { ApiError, httpClient } from '@/shared/api';
import type { Barbershop } from '@/entities/barbershop';
import type {
  AvailabilityException,
  AvailabilitySlot,
  AvailabilityWriteContext,
  IAvailabilityRepository,
  WeeklyScheduleEntry,
  Weekday,
} from './availability.contract';
import type {
  BackendAvailabilityResponseDto,
  BackendBarbershopResponseDto,
  BackendCreateExceptionRequestDto,
  BackendCreateExceptionResponseDto,
  BackendExceptionListResponseDto,
  BackendPatchExceptionRequestDto,
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

function normalizeWeekday(value: unknown): Weekday | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return (WEEKDAYS as readonly string[]).includes(normalized)
    ? (normalized as Weekday)
    : null;
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function normalizeBackendScheduleItem(item: unknown): WeeklyScheduleEntry | null {
  if (!item || typeof item !== 'object') return null;

  const raw = item as Record<string, unknown>;
  const id = raw.id ?? raw.scheduleId ?? raw.schedule_id;
  const weekday = normalizeWeekday(raw.dayOfWeek ?? raw.day_of_week);
  const barbermanId = raw.barbermanId ?? raw.barberman_id ?? null;
  const openTime = raw.openTime ?? raw.open_time;
  const closeTime = raw.closeTime ?? raw.close_time;

  if (typeof id !== 'string' || !weekday || !isTime(openTime) || !isTime(closeTime)) {
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
  async getBarbershop(barbershopId: string): Promise<Barbershop> {
    const response = await httpClient.get<BackendBarbershopResponseDto>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}`,
    );

    const raw = response?.barbershop;
    if (
      !raw ||
      typeof raw.id !== 'string' ||
      raw.id.trim().length === 0 ||
      typeof raw.name !== 'string' ||
      raw.name.trim().length === 0 ||
      typeof raw.timezone !== 'string' ||
      raw.timezone.trim().length === 0
    ) {
      throw new ApiError('Resposta de barbearia inválida.', 500, response, false);
    }

    return {
      id: raw.id,
      name: raw.name,
      timezone: raw.timezone,
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

    const normalized = Array.isArray(response?.schedules)
      ? response.schedules
          .map(normalizeBackendScheduleItem)
          .filter((entry): entry is WeeklyScheduleEntry => entry !== null)
      : [];

    // Na porta do frontend, ausência de barbermanId significa jornada geral.
    // O GET do backend, sem filtro, devolve todos os registros da unidade.
    return barbermanId
      ? normalized.filter((entry) => entry.barbermanId === barbermanId)
      : normalized.filter((entry) => entry.barbermanId === null);
  }

  async saveWeeklySchedule(
    barbershopId: string,
    entries: Omit<WeeklyScheduleEntry, 'id'>[],
    context?: AvailabilityWriteContext,
  ): Promise<WeeklyScheduleEntry[]> {
    const actorId = context?.actorId?.trim();

    if (!actorId) {
      throw new ApiError(
        'Não foi possível identificar o usuário responsável pela alteração.',
        400,
        null,
        false,
      );
    }

    /**
     * IMPORTANTE: o backend atual ainda aceita UMA entrada por PUT e faz
     * `repository.create()`. Para não corromper a jornada acumulando registros,
     * o frontend bloqueia uma sobrescrita enquanto o endpoint bulk/replace não
     * estiver conectado no backend.
     */
    const scopeBarbermanId = entries[0]?.barbermanId ?? undefined;
    const existing = await this.getWeeklySchedule(barbershopId, scopeBarbermanId ?? undefined);

    if (existing.length > 0) {
      throw new ApiError(
        'A API atual ainda não permite substituir a jornada existente com segurança.',
        409,
        { code: 'SCHEDULE_REPLACE_NOT_SUPPORTED' },
        false,
      );
    }

    if (entries.length === 0) return [];

    const saved: WeeklyScheduleEntry[] = [];

    for (const entry of entries) {
      const body: BackendUpdateScheduleRequestDto = {
        createdBy: actorId,
        dayOfWeek: entry.weekday,
        openTime: entry.range.start,
        closeTime: entry.range.end,
        barbermanId: entry.barbermanId,
      };

      const response = await httpClient.put<BackendUpdateScheduleResponseDto>(
        `/api/barbershops/${encodeURIComponent(barbershopId)}/schedules`,
        body,
      );

      if (!response || typeof response.scheduleId !== 'string') {
        throw new ApiError('Resposta inválida ao salvar jornada.', 500, response, false);
      }

      saved.push({
        id: response.scheduleId,
        ...entry,
      });
    }

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

    const normalized = Array.isArray(response?.exceptions)
      ? response.exceptions
          .map(normalizeBackendExceptionItem)
          .filter((entry): entry is AvailabilityException => entry !== null)
      : [];

    return barbermanId
      ? normalized.filter((entry) => entry.barbermanId === barbermanId)
      : normalized.filter((entry) => entry.barbermanId === null);
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

    if (!response || typeof response.exceptionId !== 'string') {
      throw new ApiError('Resposta inválida ao criar exceção.', 500, response, false);
    }

    return {
      id: response.exceptionId,
      ...exception,
    };
  }

  async updateException(
    barbershopId: string,
    exceptionId: string,
    exception: Partial<Omit<AvailabilityException, 'id'>>,
  ): Promise<AvailabilityException> {
    const body: BackendPatchExceptionRequestDto = {
      ...(exception.date !== undefined && { date: exception.date }),
      ...(exception.openTime !== undefined && { startTime: exception.openTime }),
      ...(exception.closeTime !== undefined && { endTime: exception.closeTime }),
      ...(exception.reason !== undefined && { reason: exception.reason }),
    };

    await httpClient.patch<void>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`,
      body,
    );

    // O PATCH retorna 200 sem entidade. Releitura autoritativa evita manter
    // um espelho local e confirma o que realmente foi persistido pelo Drizzle.
    // Aqui buscamos a lista bruta (sem filtrar jornada geral/profissional), pois
    // a exceção editada pode pertencer a qualquer escopo.
    const refreshedResponse = await httpClient.get<BackendExceptionListResponseDto>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions`,
    );
    const updated = Array.isArray(refreshedResponse?.exceptions)
      ? refreshedResponse.exceptions
          .map(normalizeBackendExceptionItem)
          .find((item): item is AvailabilityException => item?.id === exceptionId)
      : undefined;

    if (!updated) {
      throw new ApiError('A exceção foi atualizada, mas não pôde ser recarregada.', 500, null, false);
    }

    return updated;
  }

  async removeException(barbershopId: string, exceptionId: string): Promise<void> {
    await httpClient.delete<void>(
      `/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`,
    );
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
