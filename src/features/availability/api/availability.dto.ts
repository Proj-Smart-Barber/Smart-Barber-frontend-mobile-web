/**
 * DTOs brutos da Disponibilidade.
 *
 * ATENÇÃO: estes DTOs snake_case pertencem ao adapter MOCK e exercitam o
 * pipeline DTO -> mapper -> domínio -> UI. O backend HTTP real usa outro
 * contrato, tipado em `availability.backend.dto.ts`. A UI nunca consome
 * nenhum dos dois formatos diretamente.
 */

export type WeekdayRaw =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface BarbershopRawDto {
  id: string;
  name: string;
  timezone: string;
}

/** Uma linha de jornada recorrente — snake_case espelhando o schema Drizzle. */
export interface WeeklyScheduleEntryRawDto {
  id: string;
  day_of_week: WeekdayRaw;
  barberman_id: string | null;
  open_time: string; // "HH:mm"
  close_time: string; // "HH:mm"
}

export interface AvailabilityExceptionRawDto {
  id: string;
  date: string; // "YYYY-MM-DD"
  barberman_id: string | null;
  open_time: string | null;
  close_time: string | null;
  reason: string | null;
}

export interface AvailabilitySlotRawDto {
  start: string; // ISO 8601 com offset
  end: string;
}

/** Weekdays válidos aceitos no payload. */
export const WEEKDAYS_RAW: readonly WeekdayRaw[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];
