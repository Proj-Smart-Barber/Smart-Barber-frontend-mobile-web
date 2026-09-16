/**
 * Contrato (porta) da Agenda operacional.
 *
 * A API é a fonte de verdade: jornada, buffers, holds e reservas são
 * consolidados no backend. O frontend NÃO recalcula disponibilidade.
 *
 * Os tipos abaixo representam o domínio já consolidado que chega à UI.
 * Enquanto o contrato real não existe, um adapter de desenvolvimento
 * (agenda.mock.ts) simula a resposta do servidor.
 */
import type { AppointmentStatus } from '@/entities/appointment';

export type AgendaPaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED';

/** Escopo da consulta: OWNER = toda a unidade; BARBER = agenda própria. */
export interface AgendaScope {
  role: 'OWNER' | 'BARBER';
  staffId: string;
  // unitId: string — incluir quando o contrato de sessão/unidade fornecer.
}

export interface AgendaAppointmentEntry {
  type: 'APPOINTMENT';
  id: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
  customerName: string;
  serviceTitle: string;
  servicePriceInCents: number | null;
  professionalId: string;
  professionalName: string;
  status: AppointmentStatus;
  /** Presente apenas quando o contrato fornecer. */
  paymentStatus: AgendaPaymentStatus | null;
  /** "HH:mm" quando o cliente fez check-in. */
  checkedInAt: string | null;
  hasConflict: boolean;
}

export interface AgendaFreeSlotEntry {
  type: 'FREE_SLOT';
  id: string;
  startTime: string;
  endTime: string;
}

export interface AgendaHoldEntry {
  type: 'HOLD';
  id: string;
  startTime: string;
  endTime: string;
  /** Expiração do bloqueio quando fornecida pelo backend  */
  expiresAt: string | null;
  reason: string | null;
}

export interface AgendaBufferEntry {
  type: 'BUFFER';
  id: string;
  startTime: string;
  endTime: string;
  kind: string | null;
}

export type AgendaEntry =
  | AgendaAppointmentEntry
  | AgendaFreeSlotEntry
  | AgendaHoldEntry
  | AgendaBufferEntry;

export interface AgendaNextAppointment {
  startTime: string;
  customerName: string;
  serviceTitle: string;
  professionalName: string;
}

export interface AgendaDaySummary {
  totalSlots: number | null;
  bookedSlots: number | null;
  occupancyRatePercent: number | null;
  nextAppointment: AgendaNextAppointment | null;
  isClosed: boolean;
}

export interface AgendaDay {
  /** "yyyy-MM-dd" */
  date: string;
  summary: AgendaDaySummary;
  entries: AgendaEntry[];
}

export interface IAgendaRepository {
  getAgendaDay(params: { scope: AgendaScope; date: string }): Promise<AgendaDay>;
}
