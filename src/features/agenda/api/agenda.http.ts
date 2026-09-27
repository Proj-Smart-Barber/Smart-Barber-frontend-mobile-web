import { httpClient } from '@/shared/api';
import type {
  AgendaAppointmentEntry,
  AgendaBooking,
  AgendaDay,
  AgendaNextAppointment,
  AgendaScope,
  IAgendaRepository,
} from './agenda.contract';

interface BackendCustomerDto {
  id?: string;
  name: string;
  phoneNumber?: string;
}

interface BackendServiceDto {
  id: string;
  title: string;
  priceInCents?: number;
  durationInMinutes?: number;
}

interface BackendBookingDetailsDto {
  id: string;
  barbershopId?: string;
  barbermanId?: string;
  shoppingCartId?: string;
  customer?: BackendCustomerDto;
  services?: BackendServiceDto[];
  date: string;
  startTime: string;
  endTime: string;
  createdAt?: string;
}

interface BackendScheduleDetailsResponseDto {
  bookings: BackendBookingDetailsDto[];
}

function normalizeTime(val: string): string {
  if (!val) return '00:00';
  // Se vier como ISO "2026-09-27T09:30:00.000Z", extrai HH:mm
  if (val.includes('T')) {
    const timePart = val.split('T')[1];
    return timePart ? timePart.slice(0, 5) : '00:00';
  }
  return val.slice(0, 5);
}

export class AgendaHttpAdapter implements IAgendaRepository {
  async getAgendaDay(params: { scope: AgendaScope; date: string }): Promise<AgendaDay> {
    const response = await httpClient.get<BackendScheduleDetailsResponseDto>(
      '/api/bookings/barberman/schedule/details',
      {
        params: { date: params.date },
      },
    );

    const rawBookings = Array.isArray(response?.bookings) ? response.bookings : [];

    const entries: AgendaAppointmentEntry[] = rawBookings.map((item) => {
      const services = Array.isArray(item.services) ? item.services : [];
      const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';
      const totalPrice = services.reduce((sum, s) => sum + (s.priceInCents ?? 0), 0);
      const customerName = item.customer?.name?.trim() || 'Cliente';

      return {
        type: 'APPOINTMENT' as const,
        id: item.id,
        startTime: normalizeTime(item.startTime),
        endTime: normalizeTime(item.endTime),
        customerName,
        serviceTitle,
        servicePriceInCents: totalPrice > 0 ? totalPrice : null,
        professionalId: item.barbermanId || params.scope.staffId,
        professionalName: '',
        status: 'CONFIRMED' as const,
        paymentStatus: null,
        checkedInAt: null,
        hasConflict: false,
      };
    });

    // Ordenar entradas cronologicamente
    entries.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Próximo agendamento a partir de agora se for hoje, ou o primeiro do dia
    let nextAppointment: AgendaNextAppointment | null = null;
    if (entries.length > 0) {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      const upcoming = entries.find((e) => e.startTime >= currentTimeStr) ?? entries[0];
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
        totalSlots: null,
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
      { token },
    );

    if (!response || !response.booking || typeof response.booking.id !== 'string') {
      throw new Error('Não foi possível cancelar o agendamento.');
    }

    return response.booking;
  }
}

export const bookingScheduleHttpAdapter = new BookingScheduleHttpAdapter();
