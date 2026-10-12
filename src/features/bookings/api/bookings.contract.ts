/**
 * Contrato (porta) dos atendimentos do barbeiro.
 *
 * A API de Booking é a fonte de verdade: o barbeiro é resolvido pelo JWT
 * (`sub`) no backend — nenhum identificador vai no path ou query.
 */
export interface BookingCustomer {
  id?: string;
  name: string;
  phoneNumber: string;
}

export interface BookingService {
  id: string;
  title: string;
  priceInCents: number | null;
  durationInMinutes: number | null;
}

export interface Booking {
  id: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
  barbershopId?: string;
  barbermanId?: string;
  createdAt?: string | null;
}

export interface BookingDetails extends Booking {
  customer: BookingCustomer;
  services: BookingService[];
}

export interface UpdateBookingInput {
  bookingId: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" */
  endTime: string;
}

export interface IBookingsRepository {
  getDayBookings(params: { date: string }): Promise<BookingDetails[]>;
  updateBooking(input: UpdateBookingInput): Promise<Booking>;
  cancelBooking(bookingId: string): Promise<Booking>;
}
