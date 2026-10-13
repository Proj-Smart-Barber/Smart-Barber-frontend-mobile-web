import { httpClient } from '@/shared/api';
import type {
  Booking,
  BookingDetails,
  BookingService,
  IBookingsRepository,
  UpdateBookingInput,
} from './bookings.contract';
import { rescheduleBooking, cancelBooking as cancelBookingApi } from './bookings.api';

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
  status?: string | null;
  version?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string | null;
  capabilities?: {
    cancel?: { allowed: boolean; reasonCode?: string | null; deadlineAt?: string | null };
    reschedule?: { allowed: boolean; reasonCode?: string | null; deadlineAt?: string | null };
    complete?: { allowed: boolean; reasonCode?: string | null; deadlineAt?: string | null };
    noShow?: { allowed: boolean; reasonCode?: string | null; deadlineAt?: string | null };
  };
}

interface BackendDayBookingsResponseDto {
  bookings?: BackendBookingDto[];
}

const SCHEDULE_DETAILS_PATH = '/api/bookings/barberman/schedule/details';

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
    status: raw.status ?? null,
    version: raw.version ?? null,
    startsAt: raw.startsAt ?? null,
    endsAt: raw.endsAt ?? null,
    timezone: raw.timezone ?? null,
    capabilities: raw.capabilities,
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
    const { booking } = await rescheduleBooking(bookingId, {
      date,
      startTime,
      scope: 'UNIT',
    });

    if (!booking) {
      throw new Error('Resposta inválida do servidor ao remarcar o agendamento.');
    }

    return {
      id: booking.id,
      date: typeof booking.date === 'string' ? booking.date.slice(0, 10) : date,
      startTime: booking.startTime || startTime,
      endTime: booking.endTime || endTime,
      barbershopId: booking.barbershopId,
      barbermanId: booking.barbermanId,
      createdAt: booking.createdAt ? String(booking.createdAt) : null,
      status: booking.status ?? null,
      version: booking.version ?? null,
      startsAt: booking.startsAt ?? null,
      endsAt: booking.endsAt ?? null,
      timezone: booking.timezone ?? null,
      capabilities: booking.capabilities,
    };
  }

  async cancelBooking(bookingId: string): Promise<Booking> {
    const { booking } = await cancelBookingApi(bookingId, { scope: 'UNIT' });

    if (!booking) {
      throw new Error('Resposta inválida do servidor ao cancelar o agendamento.');
    }

    return {
      id: booking.id,
      date: typeof booking.date === 'string' ? booking.date.slice(0, 10) : '',
      startTime: booking.startTime || '',
      endTime: booking.endTime || '',
      barbershopId: booking.barbershopId,
      barbermanId: booking.barbermanId,
      createdAt: booking.createdAt ? String(booking.createdAt) : null,
      status: booking.status ?? null,
      version: booking.version ?? null,
      startsAt: booking.startsAt ?? null,
      endsAt: booking.endsAt ?? null,
      timezone: booking.timezone ?? null,
      capabilities: booking.capabilities,
    };
  }
}

export const bookingsHttpAdapter = new BookingsHttpAdapter();
