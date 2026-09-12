/**
 * Contrato (porta) da Agenda do barbeiro.
 *
 * Fonte de verdade: API de Booking (`api-feat-booking`).
 * Endpoints reais (o barbeiro é identificado pelo JWT `sub`):
 *   GET /api/booking/barberman/schedule?date=YYYY-MM-DD
 *   GET /api/booking/barberman/schedule/details?date=YYYY-MM-DD
 *   DELETE /api/booking/:bookingId/cancel
 *
 * Os tipos abaixo espelham `BookingMapper.toHTTP` e
 * `BookingDetailsMapper.toHTTP` do backend. O frontend NÃO recalcula
 * disponibilidade; apenas apresenta o que a API fornece.
 */

/** Serviço de um agendamento (BookingDetailsMapper.toHTTP.services[]). */
export interface AgendaBookingService {
  id: string;
  title: string;
  priceInCents: number;
  durationInMinutes: number;
}

/** Cliente de um agendamento (BookingDetailsMapper.toHTTP.customer). */
export interface AgendaBookingCustomer {
  id: string;
  name: string;
  phoneNumber: string;
}

/** Booking simples (GET /schedule). */
export interface AgendaBooking {
  id: string;
  barbershopId: string;
  barbermanId: string;
  shoppingCartId: string;
  /** ISO 8601 (serialização JSON de Date). */
  date: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
  createdAt: string | null;
}

/** Booking detalhado (GET /schedule/details). */
export interface AgendaBookingDetails extends AgendaBooking {
  customer: AgendaBookingCustomer;
  services: AgendaBookingService[];
}

/** Modo de exibição da agenda. */
export type AgendaViewMode = 'simple' | 'details';

export interface IBookingScheduleRepository {
  getDailySchedule(params: { date: string }): Promise<AgendaBooking[]>;
  getDailyScheduleWithDetails(params: { date: string }): Promise<AgendaBookingDetails[]>;
  cancelBooking(bookingId: string): Promise<AgendaBooking>;
}
