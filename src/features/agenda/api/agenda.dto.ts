/**
 * DTOs brutos da Agenda (respostas HTTP reais da API de Booking).
 *
 * Espelham fielmente os retornos de `BookingMapper.toHTTP` e
 * `BookingDetailsMapper.toHTTP`. Em JSON, campos `Date` chegam como
 * string ISO 8601. A UI nunca consome estes tipos diretamente —
 * sempre passam pelo mapper (agenda.mapper.ts).
 */

export interface AgendaBookingHttpDto {
  id: string;
  barbershopId: string;
  barbermanId: string;
  shoppingCartId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string | null;
}

export interface AgendaBookingServiceHttpDto {
  id: string;
  title: string;
  priceInCents: number;
  durationInMinutes: number;
}

export interface AgendaBookingCustomerHttpDto {
  id: string;
  name: string;
  phoneNumber: string;
}

export interface AgendaBookingDetailsHttpDto extends AgendaBookingHttpDto {
  customer: AgendaBookingCustomerHttpDto;
  services: AgendaBookingServiceHttpDto[];
}

/** Envelope de `GET /api/booking/barberman/schedule`. */
export interface AgendaDailyScheduleResponseDto {
  bookings: AgendaBookingHttpDto[];
}

/** Envelope de `GET /api/booking/barberman/schedule/details`. */
export interface AgendaDailyScheduleDetailsResponseDto {
  bookings: AgendaBookingDetailsHttpDto[];
}

/** Envelope de `DELETE /api/booking/:bookingId/cancel`. */
export interface AgendaCancelBookingResponseDto {
  booking: AgendaBookingHttpDto;
}
