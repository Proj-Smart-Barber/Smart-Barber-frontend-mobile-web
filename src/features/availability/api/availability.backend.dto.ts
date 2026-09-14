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

/** Contrato atual: 1 request = 1 escopo de jornada, com replace em batch. */
export interface BackendUpdateScheduleRequestDto {
  schedules: Array<{
    dayOfWeek: Weekday;
    openTime: string;
    closeTime: string;
  }>;
}

export interface BackendUpdateScheduleResponseDto {
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
