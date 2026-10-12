import { httpClient } from '@/shared/api';
import type {
  Booking,
  BookingDetails,
  BookingService,
  IBookingsRepository,
  UpdateBookingInput,
} from './bookings.contract';

interface BackendCustomerDto {
  id?: string;
  name: string;
  phoneNumber?: string | null;
}

interface BackendServiceDto {
  id: string;
  title: string;
  priceInCents?: number | null;
  durationInMinutes?: number | null;
}

interface BackendBookingDto {
  id: string;
  barbershopId?: string;
  barbermanId?: string;
  shoppingCartId?: string;
  customer?: BackendCustomerDto;
  services?: BackendServiceDto[];
  date: string;
  startTime: string;
  endTime: string;
  createdAt?: string | null;
}

interface BackendDayBookingsResponseDto {
  bookings?: BackendBookingDto[];
}

interface BackendBookingMutationResponseDto {
  booking?: BackendBookingDto;
}

const SCHEDULE_DETAILS_PATH = '/api/bookings/barberman/schedule/details';
const BOOKINGS_PATH = '/api/bookings';

function normalizeTime(val: string): string {
  if (!val) return '';
  if (val.includes('T')) {
    const timePart = val.split('T')[1];
    return timePart ? timePart.slice(0, 5) : '';
  }
  return val.slice(0, 5);
}

function normalizeDate(val: string): string {
  if (!val) return '';
  return val.slice(0, 10);
}

function mapServicesDto(services: BackendServiceDto[] | undefined): BookingService[] {
  if (!Array.isArray(services)) return [];
  return services.map((service) => ({
    id: service.id,
    title: service.title,
    priceInCents: service.priceInCents ?? null,
    durationInMinutes: service.durationInMinutes ?? null,
  }));
}

function mapBookingDto(raw: BackendBookingDto): Booking {
  if (!raw || typeof raw.id !== 'string') {
    throw new Error('Resposta inválida do servidor.');
  }

  const startTime = normalizeTime(raw.startTime);
  const endTime = normalizeTime(raw.endTime);
  if (!startTime || !endTime) {
    throw new Error('Resposta inválida do servidor.');
  }

  return {
    id: raw.id,
    date: normalizeDate(raw.date),
    startTime,
    endTime,
    barbershopId: raw.barbershopId,
    barbermanId: raw.barbermanId,
    createdAt: raw.createdAt ?? null,
  };
}

function mapBookingDetailsDto(raw: BackendBookingDto): BookingDetails {
  const booking = mapBookingDto(raw);

  return {
    ...booking,
    customer: {
      id: raw.customer?.id,
      name: raw.customer?.name?.trim() || 'Cliente',
      phoneNumber: raw.customer?.phoneNumber?.trim() ?? '',
    },
    services: mapServicesDto(raw.services),
  };
}

export class BookingsHttpAdapter implements IBookingsRepository {
  async getDayBookings({ date }: { date: string }): Promise<BookingDetails[]> {
    const response = await httpClient.get<BackendDayBookingsResponseDto>(
      SCHEDULE_DETAILS_PATH,
      { params: { date } },
    );

    const list = Array.isArray(response?.bookings) ? response.bookings : [];
    const bookings = list.map(mapBookingDetailsDto);
    return bookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async updateBooking({
    bookingId,
    date,
    startTime,
    endTime,
  }: UpdateBookingInput): Promise<Booking> {
    const response = await httpClient.patch<BackendBookingMutationResponseDto>(
      `${BOOKINGS_PATH}/${encodeURIComponent(bookingId)}/update`,
      { date, startTime, endTime },
    );

    if (!response?.booking) {
      throw new Error('Resposta inválida do servidor ao remarcar o agendamento.');
    }

    return mapBookingDto(response.booking);
  }

  async cancelBooking(bookingId: string): Promise<Booking> {
    const response = await httpClient.delete<BackendBookingMutationResponseDto>(
      `${BOOKINGS_PATH}/${encodeURIComponent(bookingId)}/cancel`,
    );

    if (!response?.booking) {
      throw new Error('Resposta inválida do servidor ao cancelar o agendamento.');
    }

    return mapBookingDto(response.booking);
  }
}

export const bookingsHttpAdapter = new BookingsHttpAdapter();
