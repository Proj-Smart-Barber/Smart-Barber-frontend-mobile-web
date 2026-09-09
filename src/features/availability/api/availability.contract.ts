/**
 * Contrato (porta) da Disponibilidade.
 *
 * O backend é a autoridade do cálculo: jornada recorrente, exceções e
 * duração dos serviços são consolidados no servidor. O frontend NÃO
 * recalcula disponibilidade.
 *
 * Contrato v1 — fechado com a dupla de backend em 2026-09-08, pós-aprovação
 * das migrations: services.durationInMinutes, barbershops.timezone,
 * barbershop_schedules.barbermanId (nullable), nova tabela
 * barbershop_schedule_exceptions, bookings.startTime/endTime.
 *
 * Enquanto o contrato real não existe, um adapter de desenvolvimento
 * (availability.mock.ts) simula as respostas do servidor.
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

/**
 * Uma entrada de jornada recorrente.
 * O schema armazena uma linha por intervalo (openTime/closeTime únicos);
 * um dia com pausa para almoço vira duas entradas com o mesmo weekday.
 * O agrupamento por dia é responsabilidade do ViewModel, não deste tipo.
 */
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
  /** null = dia inteiro bloqueado; preenchido = horário customizado */
  openTime: string | null;
  closeTime: string | null;
  reason: string | null;
}

export interface AvailabilitySlot {
  /** ISO 8601 com offset, ex: "2026-09-10T09:00:00-03:00" */
  start: string;
  end: string;
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
    params: { serviceId: string; date: string; barbermanId?: string },
  ): Promise<AvailabilitySlot[]>;
}
