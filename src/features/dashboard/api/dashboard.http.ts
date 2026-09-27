import { httpClient } from '@/shared/api';
import type {
  AppointmentStatus,
  DashboardAppointment,
  DashboardMetrics,
  IDashboardRepository,
} from './dashboard.contract';

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

function getTodayIsoString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTime(val: string): string {
  if (!val) return '00:00';
  if (val.includes('T')) {
    const timePart = val.split('T')[1];
    return timePart ? timePart.slice(0, 5) : '00:00';
  }
  return val.slice(0, 5);
}

export class DashboardHttpAdapter implements IDashboardRepository {
  async getTodayAppointments(params: {
    role: 'OWNER' | 'BARBER';
    staffId: string;
  }): Promise<DashboardAppointment[]> {
    const today = getTodayIsoString();
    const response = await httpClient.get<BackendScheduleDetailsResponseDto>(
      '/api/bookings/barberman/schedule/details',
      {
        params: { date: today },
      },
    );

    const bookings = Array.isArray(response?.bookings) ? response.bookings : [];

    const appointments: DashboardAppointment[] = bookings.map((item) => {
      const services = Array.isArray(item.services) ? item.services : [];
      const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';
      const totalPrice = services.reduce((sum, s) => sum + (s.priceInCents ?? 0), 0);
      const totalDuration = services.reduce((sum, s) => sum + (s.durationInMinutes ?? 0), 0);

      return {
        id: item.id,
        customerName: item.customer?.name?.trim() || 'Cliente',
        customerPhone: item.customer?.phoneNumber?.trim() || '',
        customerAvatarUrl: null,
        serviceTitle,
        servicePriceInCents: totalPrice,
        durationMinutes: totalDuration > 0 ? totalDuration : 30,
        barbermanId: item.barbermanId || params.staffId,
        barbermanName: '',
        scheduledTime: normalizeTime(item.startTime),
        status: 'CONFIRMED' as AppointmentStatus,
      };
    });

    appointments.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return appointments;
  }

  async getMetrics(params: {
    role: 'OWNER' | 'BARBER';
    staffId: string;
  }): Promise<DashboardMetrics> {
    const appointments = await this.getTodayAppointments(params);

    const totalRevenueInCents = appointments.reduce(
      (sum, item) => sum + item.servicePriceInCents,
      0,
    );

    return {
      totalRevenueInCents,
      targetRevenueInCents: 0,
      estimatedCommissionInCents: 0,
      totalAppointments: appointments.length,
      completedAppointments: 0,
      occupancyRatePercent: 0,
    };
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<DashboardAppointment> {
    if (status === 'CANCELLED') {
      await httpClient.delete(`/api/bookings/${encodeURIComponent(id)}/cancel`);
    } else {
      throw new Error(`A API atual não suporta atualização de status para ${status}.`);
    }

    return {
      id,
      customerName: '',
      customerPhone: '',
      serviceTitle: '',
      servicePriceInCents: 0,
      durationMinutes: 0,
      barbermanId: '',
      barbermanName: '',
      scheduledTime: '',
      status,
    };
  }
}
