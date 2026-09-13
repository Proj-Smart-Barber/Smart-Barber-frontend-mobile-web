import type { Weekday } from './availability.contract';

/** DTOs observados diretamente no backend `feat/availability-engine`. */

export interface BackendBarbershopResponseDto {
  barbershop: {
    id: string;
    name: string;
    timezone: string;
    slug?: string;
    ownerId?: string;
    cnpj?: string;
    location?: string;
    status?: string;
    avatarUrl?: string | null;
  };
}

export interface BackendScheduleItemDto {
  id: string;
  barbershopId: string;
  barbermanId: string | null;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
}

export interface BackendScheduleListResponseDto {
  schedules: BackendScheduleItemDto[];
}

/**
 * Contrato REAL do controller atual: uma entrada por PUT.
 * `createdBy` é necessário para evitar o fallback inválido "mock-user-id".
 */
export interface BackendUpdateScheduleRequestDto {
  createdBy: string;
  dayOfWeek: Weekday;
  openTime: string;
  closeTime: string;
  barbermanId?: string | null;
}

export interface BackendUpdateScheduleResponseDto {
  scheduleId: string;
  message: string;
}

export interface BackendExceptionItemDto {
  id: string;
  barbershopId: string;
  barbermanId: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

export interface BackendExceptionListResponseDto {
  exceptions: BackendExceptionItemDto[];
}

export interface BackendCreateExceptionRequestDto {
  date: string;
  barbermanId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export interface BackendCreateExceptionResponseDto {
  exceptionId: string;
  message: string;
}

export interface BackendPatchExceptionRequestDto {
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

export interface BackendAvailabilityResponseDto {
  slots: Array<{
    start: string;
    end: string;
  }>;
}
