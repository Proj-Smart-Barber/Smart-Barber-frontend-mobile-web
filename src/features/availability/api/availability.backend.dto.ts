import type { Weekday } from './availability.contract';

/**
 * DTOs do backend REAL da branch feat/availability-engine.
 *
 * Estes tipos espelham os controllers Express atuais. Eles ficam separados
 * dos DTOs snake_case usados pelo mock para não contaminar a UI/domínio com
 * detalhes de transporte.
 */

export interface BackendScheduleListResponseDto {
  schedules: unknown[];
}

export interface BackendUpdateScheduleRequestDto {
  dayOfWeek: Weekday;
  openTime: string;
  closeTime: string;
  barbermanId?: string | null;
  createdBy?: string;
}

export interface BackendUpdateScheduleResponseDto {
  scheduleId: string;
  message: string;
}

export interface BackendExceptionListResponseDto {
  exceptions: unknown[];
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

export interface BackendPatchExceptionResponseDto {
  message: string;
}

export interface BackendAvailabilityResponseDto {
  slots: Array<{
    start: string;
    end: string;
  }>;
}
