/**
 * Contrato (porta) da Disponibilidade.
 *
 * O backend é a autoridade do cálculo: jornada recorrente, exceções e
 * duração dos serviços são consolidados no servidor. O frontend NÃO
 * recalcula disponibilidade.
 */

import type { Barbershop } from '@/entities/barbershop';

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface TimeRange {
  /** "HH:mm" na timezone da unidade */
  start: string;
  /** "HH:mm" na timezone da unidade */
  end: string;
}

export interface WeeklyScheduleEntry {
  id: string;
  weekday: Weekday;
  /** null = jornada geral da barbearia; preenchido = escala de um profissional. */
  barbermanId: string | null;
  range: TimeRange;
}

export interface AvailabilityException {
  id: string;
  /** "YYYY-MM-DD" na timezone da unidade */
  date: string;
  barbermanId: string | null;
  /** null = dia inteiro bloqueado; preenchido = pausa/horário bloqueado */
  openTime: string | null;
  closeTime: string | null;
  reason: string | null;
}

export interface AvailabilitySlot {
  /** ISO 8601 com offset */
  start: string;
  end: string;
}

export type ScheduleScopeState = 'INHERIT' | 'CUSTOM' | 'CLOSED';

/** Leitura autoritativa de um escopo (geral ou de um profissional) do contrato final. */
export interface ScheduleScopeDocument {
  /** barbermanId consultado; null = jornada geral. */
  barbermanId: string | null;
  /** Períodos gravados no escopo. Vazio não distingue INHERIT/CLOSED: use `state`. */
  schedules: WeeklyScheduleEntry[];
  /** Períodos efetivamente ofertados (herança e jornada geral fechada já aplicadas). */
  effectiveSchedules: WeeklyScheduleEntry[];
  state: ScheduleScopeState;
  version: number;
  /** Legado ambíguo: jornada fechada até revisão explícita. */
  needsReview: boolean;
  /** Relógio autoritativo do servidor (ISO); null se ausente na resposta. */
  serverTime: string | null;
}

export interface SaveScheduleScopeInput {
  /** null = jornada geral da unidade. */
  barbermanId: string | null;
  state: ScheduleScopeState;
  entries: Omit<WeeklyScheduleEntry, 'id'>[];
  expectedVersion: number;
  /** UUIDv7 de idempotência, enviado como Idempotency-Key. */
  requestId: string;
}

export interface IAvailabilityRepository {
  getBarbershop(barbershopId: string): Promise<Barbershop>;

  getScheduleScope(
    barbershopId: string,
    barbermanId?: string,
  ): Promise<ScheduleScopeDocument>;

  saveScheduleScope(
    barbershopId: string,
    input: SaveScheduleScopeInput,
  ): Promise<ScheduleScopeDocument>;

  getWeeklySchedule(
    barbershopId: string,
    barbermanId?: string,
  ): Promise<WeeklyScheduleEntry[]>;

  saveWeeklySchedule(
    barbershopId: string,
    entries: Omit<WeeklyScheduleEntry, 'id'>[],
    barbermanId?: string,
  ): Promise<WeeklyScheduleEntry[]>;

  listExceptions(
    barbershopId: string,
    barbermanId?: string,
  ): Promise<AvailabilityException[]>;

  createException(
    barbershopId: string,
    exception: Omit<AvailabilityException, 'id'>,
  ): Promise<AvailabilityException>;

  updateException(
    barbershopId: string,
    exceptionId: string,
    exception: Partial<Omit<AvailabilityException, 'id'>>,
  ): Promise<AvailabilityException>;

  removeException(barbershopId: string, exceptionId: string): Promise<void>;

  getCalculatedAvailability(
    barbershopId: string,
    params: { serviceIds: string[]; date: string; barbermanId?: string },
  ): Promise<AvailabilitySlot[]>;
}
