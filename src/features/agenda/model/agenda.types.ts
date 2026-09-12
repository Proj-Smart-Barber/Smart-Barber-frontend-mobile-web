import type { AgendaBookingDetails } from '../api/agenda.contract';
import { timeToMinutes } from './agenda.helpers';

export type {
  AgendaBooking,
  AgendaBookingDetails,
  AgendaBookingService,
  AgendaBookingCustomer,
  AgendaViewMode,
} from '../api/agenda.contract';

/** Próximo atendimento do dia pronto para exibição. */
export interface AgendaNextBookingView {
  startTime: string;
  customerName: string;
}

/**
 * Resumo do dia derivado no cliente a partir dos bookings detalhados.
 * É agregação de apresentação (contagem, receita prevista, próximo) —
 * não recalcula disponibilidade, que é responsabilidade do backend.
 */
export interface AgendaSummaryView {
  bookingsCount: number;
  revenueInCents: number;
  next: AgendaNextBookingView | null;
}

interface BuildSummaryOptions {
  isToday?: boolean;
  isFuture?: boolean;
  now?: Date;
}

export function buildAgendaSummaryView(
  bookings: AgendaBookingDetails[],
  options: BuildSummaryOptions = {},
): AgendaSummaryView | null {
  if (!Array.isArray(bookings) || bookings.length === 0) return null;

  const revenueInCents = bookings.reduce(
    (total, booking) =>
      total +
      booking.services.reduce((sum, service) => sum + (service.priceInCents || 0), 0),
    0,
  );

  const next = resolveNextBooking(bookings, options);

  return { bookingsCount: bookings.length, revenueInCents, next };
}

function resolveNextBooking(
  bookings: AgendaBookingDetails[],
  { isToday = false, isFuture = false, now = new Date() }: BuildSummaryOptions,
): AgendaNextBookingView | null {
  let candidate: AgendaBookingDetails | undefined;

  if (isToday) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    candidate = bookings.find((booking) => timeToMinutes(booking.startTime) >= nowMinutes);
  } else if (isFuture) {
    candidate = bookings[0];
  }

  if (!candidate) return null;

  return { startTime: candidate.startTime, customerName: candidate.customer.name };
}
