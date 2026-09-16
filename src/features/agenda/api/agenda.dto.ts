/**
 * DTOs brutos da Agenda.
 *
 * ATENÇÃO: formato de desenvolvimento usado pelo adapter mock
 * (agenda.mock.ts) para exercitar o pipeline completo
 * (DTO bruto -> mapper -> domínio -> UI). Será substituído pelo
 * contrato real da API quando o backend publicar a disponibilidade
 * consolidada. A UI nunca consome estes tipos diretamente.
 */
import type { AppointmentStatus } from '@/entities/appointment';
import type { AgendaPaymentStatus } from './agenda.contract';

export interface AgendaAppointmentRawDto {
  type: 'APPOINTMENT';
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  service_title: string;
  service_price_in_cents: number | null;
  professional_id: string;
  professional_name: string;
  status: string;
  payment_status: string | null;
  checked_in_at: string | null;
  has_conflict: boolean;
}

export interface AgendaFreeSlotRawDto {
  type: 'FREE_SLOT';
  id: string;
  start_time: string;
  end_time: string;
}

export interface AgendaHoldRawDto {
  type: 'HOLD';
  id: string;
  start_time: string;
  end_time: string;
  expires_at: string | null;
  reason: string | null;
}

export interface AgendaBufferRawDto {
  type: 'BUFFER';
  id: string;
  start_time: string;
  end_time: string;
  kind: string | null;
}

export type AgendaEntryRawDto =
  | AgendaAppointmentRawDto
  | AgendaFreeSlotRawDto
  | AgendaHoldRawDto
  | AgendaBufferRawDto;

export interface AgendaNextAppointmentRawDto {
  start_time: string;
  customer_name: string;
  service_title: string;
  professional_name: string;
}

export interface AgendaDaySummaryRawDto {
  total_slots: number | null;
  booked_slots: number | null;
  occupancy_rate_percent: number | null;
  next_appointment: AgendaNextAppointmentRawDto | null;
  is_closed: boolean;
}

export interface AgendaDayRawDto {
  date: string;
  summary: AgendaDaySummaryRawDto;
  entries: AgendaEntryRawDto[];
}

/** Status válidos aceitos no payload (fonte: entities/appointment). */
export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'WAITING',
  'CONFIRMED',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

/** Status de pagamento válidos aceitos no payload. */
export const AGENDA_PAYMENT_STATUSES: readonly AgendaPaymentStatus[] = [
  'PAID',
  'PENDING',
  'REFUNDED',
];
