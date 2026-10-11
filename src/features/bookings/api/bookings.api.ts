import { httpClient } from '../../../shared/api/http-client';
import type {
  BookingDto,
  CreateBookingRequestDto,
  ProfessionalDto,
  ListProfessionalsResponse,
  FetchMyBookingsResponse,
} from './bookings.dto';

export async function createBooking(
  request: CreateBookingRequestDto,
  idempotencyKey?: string
): Promise<{ booking: BookingDto }> {
  return httpClient.post<{ booking: BookingDto }>(
    '/api/bookings',
    request,
    {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }
  );
}

export async function listBarbershopProfessionals(
  shopId: string
): Promise<ProfessionalDto[]> {
  const response = await httpClient.get<ListProfessionalsResponse>(
    `/api/barbershops/${shopId}/professionals`
  );
  return response.professionals ?? [];
}

export async function fetchMyBookings(): Promise<BookingDto[]> {
  const response = await httpClient.get<FetchMyBookingsResponse>(
    '/api/bookings/me'
  );
  return response.bookings ?? [];
}

export async function getBookingById(bookingId: string): Promise<BookingDto> {
  const response = await httpClient.get<{ booking: BookingDto }>(
    `/api/bookings/${bookingId}`
  );
  return response.booking;
}
