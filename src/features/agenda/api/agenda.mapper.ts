/**
 * Normalização DTO -> domínio da Agenda.
 * Entradas inválidas (tipo desconhecido, horário fora de "HH:mm",
 * status inexistente) são descartadas de forma defensiva — a UI
 * nunca recebe payload bruto.
 */
import type {
  AgendaBufferEntry,
  AgendaDay,
  AgendaEntry,
  AgendaFreeSlotEntry,
  AgendaHoldEntry,
  AgendaAppointmentEntry,
  AgendaNextAppointment,
  AgendaPaymentStatus,
} from './agenda.contract';
import type { AppointmentStatus } from '@/entities/appointment';
import {
  AGENDA_PAYMENT_STATUSES,
  APPOINTMENT_STATUSES,
  type AgendaAppointmentRawDto,
  type AgendaBufferRawDto,
  type AgendaDayRawDto,
  type AgendaEntryRawDto,
  type AgendaFreeSlotRawDto,
  type AgendaHoldRawDto,
} from './agenda.dto';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === 'string' && (APPOINTMENT_STATUSES as readonly string[]).includes(value);
}

function isPaymentStatus(value: unknown): value is AgendaPaymentStatus {
  return typeof value === 'string' && (AGENDA_PAYMENT_STATUSES as readonly string[]).includes(value);
}

function isValidEntryBase(entry: AgendaEntryRawDto): boolean {
  return (
    typeof entry.id === 'string' &&
    entry.id.length > 0 &&
    isValidTime(entry.start_time) &&
    isValidTime(entry.end_time)
  );
}

function mapAppointmentDto(dto: AgendaAppointmentRawDto): AgendaAppointmentEntry | null {
  if (!isValidEntryBase(dto)) return null;
  if (!isAppointmentStatus(dto.status)) return null;
  if (typeof dto.customer_name !== 'string' || dto.customer_name.length === 0) return null;
  if (typeof dto.service_title !== 'string' || dto.service_title.length === 0) return null;
  if (typeof dto.professional_id !== 'string' || typeof dto.professional_name !== 'string') {
    return null;
  }

  return {
    type: 'APPOINTMENT',
    id: dto.id,
    startTime: dto.start_time,
    endTime: dto.end_time,
    customerName: dto.customer_name,
    serviceTitle: dto.service_title,
    servicePriceInCents: typeof dto.service_price_in_cents === 'number' ? dto.service_price_in_cents : null,
    professionalId: dto.professional_id,
    professionalName: dto.professional_name,
    status: dto.status,
    paymentStatus: isPaymentStatus(dto.payment_status) ? dto.payment_status : null,
    checkedInAt: isValidTime(dto.checked_in_at) ? dto.checked_in_at : null,
    hasConflict: dto.has_conflict === true,
  };
}

function mapFreeSlotDto(dto: AgendaFreeSlotRawDto): AgendaFreeSlotEntry | null {
  if (!isValidEntryBase(dto)) return null;
  return { type: 'FREE_SLOT', id: dto.id, startTime: dto.start_time, endTime: dto.end_time };
}

function mapHoldDto(dto: AgendaHoldRawDto): AgendaHoldEntry | null {
  if (!isValidEntryBase(dto)) return null;
  return {
    type: 'HOLD',
    id: dto.id,
    startTime: dto.start_time,
    endTime: dto.end_time,
    expiresAt: typeof dto.expires_at === 'string' && dto.expires_at.length > 0 ? dto.expires_at : null,
    reason: typeof dto.reason === 'string' && dto.reason.length > 0 ? dto.reason : null,
  };
}

function mapBufferDto(dto: AgendaBufferRawDto): AgendaBufferEntry | null {
  if (!isValidEntryBase(dto)) return null;
  return {
    type: 'BUFFER',
    id: dto.id,
    startTime: dto.start_time,
    endTime: dto.end_time,
    kind: typeof dto.kind === 'string' && dto.kind.length > 0 ? dto.kind : null,
  };
}

function mapEntry(dto: AgendaEntryRawDto): AgendaEntry | null {
  switch (dto?.type) {
    case 'APPOINTMENT':
      return mapAppointmentDto(dto);
    case 'FREE_SLOT':
      return mapFreeSlotDto(dto);
    case 'HOLD':
      return mapHoldDto(dto);
    case 'BUFFER':
      return mapBufferDto(dto);
    default:
      return null;
  }
}

function mapNextAppointment(raw: AgendaDayRawDto['summary']['next_appointment']): AgendaNextAppointment | null {
  if (!raw) return null;
  if (
    !isValidTime(raw.start_time) ||
    typeof raw.customer_name !== 'string' ||
    typeof raw.service_title !== 'string' ||
    typeof raw.professional_name !== 'string'
  ) {
    return null;
  }
  return {
    startTime: raw.start_time,
    customerName: raw.customer_name,
    serviceTitle: raw.service_title,
    professionalName: raw.professional_name,
  };
}

export function mapAgendaDayDto(dto: AgendaDayRawDto): AgendaDay {
  const entries: AgendaEntry[] = [];
  for (const raw of Array.isArray(dto.entries) ? dto.entries : []) {
    const mapped = mapEntry(raw);
    if (mapped) entries.push(mapped);
  }

  const summary = dto.summary;

  return {
    date: typeof dto.date === 'string' ? dto.date : '',
    summary: {
      totalSlots: typeof summary?.total_slots === 'number' ? summary.total_slots : null,
      bookedSlots: typeof summary?.booked_slots === 'number' ? summary.booked_slots : null,
      occupancyRatePercent:
        typeof summary?.occupancy_rate_percent === 'number' ? summary.occupancy_rate_percent : null,
      nextAppointment: mapNextAppointment(summary?.next_appointment),
      isClosed: summary?.is_closed === true,
    },
    entries,
  };
}
