import { httpClient } from '@/shared/api';
import type {
  AgendaAppointmentEntry,
  AgendaBooking,
  AgendaDay,
  AgendaNextAppointment,
  AgendaScope,
  IAgendaRepository,
} from './agenda.contract';
import type { AppointmentStatus } from '@/entities/appointment';

interface BackendCustomerDto {
  id?: string;
  name: string;
  phoneNumber?: string;
}

interface BackendServiceDto {
  id: string;
  serviceId?: string;
  title: string;
  priceInCents?: number;
  durationInMinutes?: number;
}

interface BackendBookingDetailsDto {
  id: string;
  barbershopId?: string;
  barbermanId?: string;
  barbermanName?: string;
  professionalName?: string;
  shoppingCartId?: string;
  customer?: BackendCustomerDto;
  services?: BackendServiceDto[];
  status?: string | null;
  totalPriceInCents?: number | null;
  date: string | Date;
  startTime: string;
  endTime: string;
  createdAt?: string;
}

interface BackendScheduleDetailsResponseDto {
  bookings: BackendBookingDetailsDto[];
  serverTime?: string;
}

interface BackendUnitBookingsResponseDto {
  items: BackendBookingDetailsDto[];
  summary?: {
    totalBookings: number;
    totalRevenueInCents: number;
  };
  serverTime?: string;
}

const VALID_APPOINTMENT_STATUSES = new Set([
  'WAITING',
  'CONFIRMED',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

function resolveAppointmentStatus(status?: string | null): AppointmentStatus {
  if (!status) return 'UNKNOWN';
  const upper = status.toUpperCase();
  if (VALID_APPOINTMENT_STATUSES.has(upper)) {
    return upper as AppointmentStatus;
  }
  return 'UNKNOWN';
}

function normalizeTime(val: string): string {
  if (!val) return '00:00';
  if (val.includes('T')) {
    const timePart = val.split('T')[1];
    return timePart ? timePart.slice(0, 5) : '00:00';
  }
  return val.slice(0, 5);
}

export class AgendaHttpAdapter implements IAgendaRepository {
  async getAgendaDay(params: { scope: AgendaScope; date: string }): Promise<AgendaDay> {
    let rawBookings: BackendBookingDetailsDto[] = [];
    let serverTimeStr: string | undefined;
    let unitSummary: { totalBookings: number; totalRevenueInCents: number } | undefined;

    if (params.scope.shopId) {
      // Endpoint da Unidade: BARBER filtra próprio ID, OWNER consulta equipe
      const queryParams = new URLSearchParams();
      queryParams.set('date', params.date);
      queryParams.set('limit', '100');
      if (params.scope.role === 'BARBER') {
        queryParams.set('barbermanId', params.scope.staffId);
      }

      const response = await httpClient.get<BackendUnitBookingsResponseDto>(
        `/api/barbershops/${params.scope.shopId}/bookings?${queryParams.toString()}`
      );

      rawBookings = Array.isArray(response?.items) ? response.items : [];
      serverTimeStr = response?.serverTime;
      unitSummary = response?.summary;
    } else {
      // Endpoint pessoal do barbeiro
      const response = await httpClient.get<BackendScheduleDetailsResponseDto>(
        '/api/bookings/barberman/schedule/details',
        {
          params: { date: params.date },
        }
      );

      rawBookings = Array.isArray(response?.bookings) ? response.bookings : [];
      serverTimeStr = response?.serverTime;
    }

    const entries: AgendaAppointmentEntry[] = rawBookings.map((item) => {
      const services = Array.isArray(item.services) ? item.services : [];
      const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';

      const hasServicePrices = services.some((s) => s.priceInCents != null);
      const calculatedPrice = services.reduce((sum, s) => sum + (s.priceInCents ?? 0), 0);
      const totalPrice =
        item.totalPriceInCents != null
          ? item.totalPriceInCents
          : hasServicePrices && calculatedPrice > 0
          ? calculatedPrice
          : null;

      const customerName = item.customer?.name?.trim() || 'Cliente';
      const resolvedStatus = resolveAppointmentStatus(item.status);

      return {
        type: 'APPOINTMENT' as const,
        id: item.id,
        startTime: normalizeTime(item.startTime),
        endTime: normalizeTime(item.endTime),
        customerName,
        serviceTitle,
        servicePriceInCents: totalPrice,
        professionalId: item.barbermanId || params.scope.staffId,
        professionalName: item.professionalName || item.barbermanName || '',
        status: resolvedStatus,
        paymentStatus: null,
        checkedInAt: null,
        hasConflict: false,
      };
    });

    entries.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Próximo agendamento ativo (não cancelado/concluído)
    let nextAppointment: AgendaNextAppointment | null = null;
    const activeEntries = entries.filter(
      (e) => e.status !== 'CANCELLED' && e.status !== 'COMPLETED' && e.status !== 'NO_SHOW'
    );

    if (activeEntries.length > 0) {
      const refDate = serverTimeStr ? new Date(serverTimeStr) : new Date();
      const currentHours = String(refDate.getHours()).padStart(2, '0');
      const currentMinutes = String(refDate.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      const upcoming = activeEntries.find((e) => e.startTime >= currentTimeStr) ?? activeEntries[0];
      if (upcoming) {
        nextAppointment = {
          startTime: upcoming.startTime,
          customerName: upcoming.customerName,
          serviceTitle: upcoming.serviceTitle,
          professionalName: upcoming.professionalName,
        };
      }
    }

    return {
      date: params.date,
      summary: {
        totalSlots: unitSummary?.totalBookings ?? null,
        bookedSlots: entries.length,
        occupancyRatePercent: null,
        nextAppointment,
        isClosed: false,
      },
      entries,
    };
  }
}

export class BookingScheduleHttpAdapter {
  async cancelBooking(bookingId: string, token?: string | null): Promise<AgendaBooking> {
    const response = await httpClient.delete<{ booking?: AgendaBooking }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
      { token }
    );

    if (!response || !response.booking || typeof response.booking.id !== 'string') {
      throw new Error('Não foi possível cancelar o agendamento.');
    }

    return response.booking;
  }
}

export const bookingScheduleHttpAdapter = new BookingScheduleHttpAdapter();
