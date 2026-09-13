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

/**
 * Contexto de escrita vindo da camada app.
 * O backend atual ainda recebe `createdBy` no PUT de schedules; manter o ator
 * separado da entidade evita contaminar o domínio da jornada com autenticação.
 */
export interface AvailabilityWriteContext {
  actorId?: string | null;
}

export interface IAvailabilityRepository {
  getBarbershop(barbershopId: string): Promise<Barbershop>;

  getWeeklySchedule(
    barbershopId: string,
    barbermanId?: string,
  ): Promise<WeeklyScheduleEntry[]>;

  saveWeeklySchedule(
    barbershopId: string,
    entries: Omit<WeeklyScheduleEntry, 'id'>[],
    context?: AvailabilityWriteContext,
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
