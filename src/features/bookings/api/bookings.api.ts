import { serverClock } from '../lib/server-clock';
import { httpClient } from '../../../shared/api/http-client';
import {
  bookingDtoSchema,
  fetchUnitBookingsResponseSchema,
  fetchMyBookingsResponseSchema,
  customerLookupResultSchema,
  getBookingAvailabilityResponseSchema,
} from './bookings.schema';
import type {
  BookingDto,
  CreateBookingRequestDto,
  CreateOperationalBookingRequestDto,
  ProfessionalDto,
  ListProfessionalsResponse,
  FetchMyBookingsResponse,
  FetchMyBookingsParams,
  FetchUnitBookingsParams,
  FetchUnitBookingsResponse,
  CustomerLookupRequest,
  CustomerLookupResult,
  CancelBookingRequestDto,
  RescheduleBookingRequestDto,
  TransitionBookingStatusRequestDto,
  BookingAvailabilityRequestDto,
  BookingAvailabilityResponseDto,
} from './bookings.dto';

export async function createBooking(
  request: CreateBookingRequestDto,
  idempotencyKey?: string
): Promise<{ booking: BookingDto; serverTime?: string }> {
  const payload = {
    ...request,
    scope: request.scope ?? 'PERSONAL',
  };

  const response = await httpClient.post<{ booking: BookingDto; serverTime?: string }>(
    '/api/bookings',
    payload,
    {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }
  );

  return {
    booking: bookingDtoSchema.parse(response.booking),
    serverTime: response.serverTime,
  };
}

export async function createOperationalBooking(
  shopId: string,
  request: CreateOperationalBookingRequestDto,
  idempotencyKey?: string
): Promise<{ booking: BookingDto; serverTime?: string }> {
  const payload = {
    ...request,
    shopId,
    scope: 'UNIT' as const,
  };

  const response = await httpClient.post<{ booking: BookingDto; serverTime?: string }>(
    '/api/bookings',
    payload,
    {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }
  );

  return {
    booking: bookingDtoSchema.parse(response.booking),
    serverTime: response.serverTime,
  };
}

export async function listBarbershopProfessionals(
  shopId: string
): Promise<ProfessionalDto[]> {
  const response = await httpClient.get<ListProfessionalsResponse>(
    `/api/barbershops/${shopId}/professionals`
  );
  return response.professionals ?? [];
}

export async function fetchMyBookings(
  params?: FetchMyBookingsParams
): Promise<BookingDto[]> {
  const queryParams = new URLSearchParams();
  if (params?.page) {
    queryParams.set('page', String(params.page));
  }

  const query = queryParams.toString();
  const url = query ? `/api/bookings/me?${query}` : '/api/bookings/me';

  const response = await httpClient.get<FetchMyBookingsResponse>(url);
  const parsed = fetchMyBookingsResponseSchema.parse(response);
  return parsed.bookings;
}

export async function fetchUnitBookings(
  shopId: string,
  params?: FetchUnitBookingsParams
): Promise<FetchUnitBookingsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));
  if (params?.date) queryParams.set('date', params.date);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.barbermanId) queryParams.set('barbermanId', params.barbermanId);

  const query = queryParams.toString();
  const url = query
    ? `/api/barbershops/${shopId}/bookings?${query}`
    : `/api/barbershops/${shopId}/bookings`;

  const response = await httpClient.get<FetchUnitBookingsResponse>(url);
  const parsed = fetchUnitBookingsResponseSchema.parse(response);
  if (parsed.serverTime && Number.isFinite(Date.parse(parsed.serverTime))) serverClock.syncWithServer(parsed.serverTime);
  return parsed;
}

export async function getBookingById(bookingId: string, scope: 'PERSONAL' | 'UNIT' = 'PERSONAL'): Promise<BookingDto> {
  const response = await httpClient.get<{ booking: BookingDto }>(
    `/api/bookings/${bookingId}`, { params: { scope } }
  );
  const booking = bookingDtoSchema.parse(response.booking);
  if (booking.serverTime && Number.isFinite(Date.parse(booking.serverTime))) serverClock.syncWithServer(booking.serverTime);
  return booking;
}

export async function lookupCustomer(
  shopId: string,
  criteria: CustomerLookupRequest
): Promise<CustomerLookupResult> {
  const hasEmail = Boolean(criteria?.email?.trim());
  const hasCpf = Boolean(criteria?.cpf?.trim());

  if ((hasEmail && hasCpf) || (!hasEmail && !hasCpf)) {
    throw new Error('Forneça exatamente um critério de busca (email ou cpf).');
  }

  const payload: CustomerLookupRequest = {};
  if (hasEmail) payload.email = criteria.email!.trim();
  if (hasCpf) payload.cpf = criteria.cpf!.trim();

  const response = await httpClient.post<CustomerLookupResult>(
    `/api/barbershops/${shopId}/customers/lookup`,
    payload
  );

  return customerLookupResultSchema.parse(response);
}

export async function cancelBooking(
  bookingId: string,
  request?: CancelBookingRequestDto,
  idempotencyKey?: string
): Promise<{ booking: BookingDto; serverTime?: string }> {
  const options = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;
  const response = options
    ? await httpClient.delete<{ booking: BookingDto; serverTime?: string }>(
        `/api/bookings/${bookingId}/cancel`,
        request,
        options
      )
    : await httpClient.delete<{ booking: BookingDto; serverTime?: string }>(
        `/api/bookings/${bookingId}/cancel`,
        request
      );

  return {
    booking: bookingDtoSchema.parse(response.booking),
    serverTime: response.serverTime,
  };
}

export async function rescheduleBooking(
  bookingId: string,
  request: RescheduleBookingRequestDto,
  idempotencyKey?: string
): Promise<{ booking: BookingDto; serverTime?: string }> {
  const options = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;
  const response = options
    ? await httpClient.patch<{ booking: BookingDto; serverTime?: string }>(
        `/api/bookings/${bookingId}/reschedule`,
        request,
        options
      )
    : await httpClient.patch<{ booking: BookingDto; serverTime?: string }>(
        `/api/bookings/${bookingId}/reschedule`,
        request
      );

  return {
    booking: bookingDtoSchema.parse(response.booking),
    serverTime: response.serverTime,
  };
}

export async function transitionBookingStatus(
  bookingId: string,
  request: TransitionBookingStatusRequestDto,
  idempotencyKey?: string
): Promise<{ booking: BookingDto; serverTime?: string }> {
  const options = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined;
  const response = options
    ? await httpClient.patch<{ booking: BookingDto; serverTime?: string }>(
        `/api/bookings/${bookingId}/status`,
        request,
        options
      )
    : await httpClient.patch<{ booking: BookingDto; serverTime?: string }>(
        `/api/bookings/${bookingId}/status`,
        request
      );

  return {
    booking: bookingDtoSchema.parse(response.booking),
    serverTime: response.serverTime,
  };
}




export async function getBookingAvailability(
  shopId: string,
  params: BookingAvailabilityRequestDto
): Promise<BookingAvailabilityResponseDto> {
  const queryParams = new URLSearchParams();
  queryParams.set('date', params.date);
  queryParams.set('serviceIds', params.serviceIds.join(','));
  if (params.barbermanId) {
    queryParams.set('barbermanId', params.barbermanId);
  }

  const response = await httpClient.get<unknown>(
    `/api/barbershops/${shopId}/availability?${queryParams.toString()}`
  );

  const parsed = getBookingAvailabilityResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('Resposta de disponibilidade inválida.');
  }

  return parsed.data;
}
