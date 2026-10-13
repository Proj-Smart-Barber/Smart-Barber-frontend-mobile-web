import type { BookingDto } from '@/features/bookings/api/bookings.dto';
import { fetchUnitBookings } from '@/features/bookings/api/bookings.api';
import { serverClock } from '@/features/bookings/lib/server-clock';
import { getCivilDateInTimezone } from '@/shared/lib/civil-time';
import type {
  AppointmentStatus,
  DashboardAppointment,
  DashboardMetrics,
  IDashboardRepository,
} from './dashboard.contract';

function getTodayCivilDate(timezone: string = 'America/Sao_Paulo'): string {
  const authoritativeMs = serverClock.now();
  if (authoritativeMs !== null) {
    return getCivilDateInTimezone(authoritativeMs, timezone);
  }
  throw new Error('Relógio do servidor não sincronizado.');
}

function normalizeTime(val?: string | null): string {
  if (!val) return '00:00';
  if (val.includes('T')) {
    const timePart = val.split('T')[1];
    return timePart ? timePart.slice(0, 5) : '00:00';
  }
  return val.slice(0, 5);
}

const VALID_STATUSES: Set<string> = new Set([
  'WAITING',
  'CONFIRMED',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export class DashboardHttpAdapter implements IDashboardRepository {
  async getTodayAppointments(params: {
    role: 'OWNER' | 'BARBER';
    staffId: string;
    shopId?: string | null;
    timezone?: string;
  }): Promise<DashboardAppointment[]> {
    if (!params.shopId || !params.staffId) throw new Error('Selecione uma unidade com vínculo ativo.');
    const timezone = params.timezone || 'America/Sao_Paulo';
    if (!serverClock.hasValidReference()) {
      const bootstrap = await fetchUnitBookings(params.shopId, { limit: 1, barbermanId: params.role === 'BARBER' ? params.staffId : undefined });
      if (!bootstrap.serverTime || !serverClock.hasValidReference()) throw new Error('Relógio do servidor não sincronizado.');
    }
    const today = getTodayCivilDate(timezone);
    const bookings: BookingDto[] = [];
    let page = 1;
    while (true) {
      const response = await fetchUnitBookings(params.shopId, { date: today, barbermanId: params.role === 'BARBER' ? params.staffId : undefined, page, limit: 100 });
      bookings.push(...response.items);
      if (!response.hasNext) break;
      if (!response.items.length || page > Math.ceil(response.total / response.limit) + 1) throw new Error('Paginação inconsistente.');
      page++;
    }

    return projectDashboardAppointments(bookings, today);
  }

  async getMetrics(params: {
    role: 'OWNER' | 'BARBER';
    staffId: string;
    shopId?: string | null;
    timezone?: string;
  }): Promise<DashboardMetrics> {
    const appointments = await this.getTodayAppointments(params);

    const totalRevenueInCents = appointments.reduce(
      (sum, item) => sum + (item.servicePriceInCents ?? 0),
      0,
    );

    const hasIncompleteData = appointments.some((a) => a.hasIncompleteData);

    return {
      totalRevenueInCents: hasIncompleteData ? null : totalRevenueInCents,
      targetRevenueInCents: null,
      estimatedCommissionInCents: null,
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter((a) => a.status === 'COMPLETED').length,
      occupancyRatePercent: null,
      hasIncompleteData,
    };
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<DashboardAppointment> {
    throw new Error(
      'Ações de status e cancelamento devem ser realizadas pela Agenda operacional com controle de versão e idempotência.',
    );
  }
}

export function projectDashboardAppointments(bookings: BookingDto[], today: string): DashboardAppointment[] {
    const appointments: DashboardAppointment[] = bookings.map((item) => {
      const services = Array.isArray(item.services) ? item.services : [];
      const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';

      let hasIncompleteData = false;
      let totalPrice: number | null = 0;
      let totalDuration: number | null = 0;

      if (item.totalPriceInCents != null) {
        totalPrice = item.totalPriceInCents;
      } else if (services.length > 0) {
        for (const s of services) {
          if (s.priceInCents == null) {
            hasIncompleteData = true;
          } else {
            totalPrice += s.priceInCents;
          }
        }
      } else {
        hasIncompleteData = true;
      }

      if (item.totalDurationInMinutes != null) {
        totalDuration = item.totalDurationInMinutes;
      } else if (services.length > 0) {
        for (const s of services) {
          if (s.durationInMinutes == null) {
            hasIncompleteData = true;
          } else {
            totalDuration += s.durationInMinutes;
          }
        }
      } else {
        hasIncompleteData = true;
      }

      const rawStatus = (item.status || '').toUpperCase();
      const status: AppointmentStatus = VALID_STATUSES.has(rawStatus)
        ? (rawStatus as AppointmentStatus)
        : 'UNKNOWN';

      if (hasIncompleteData) { totalPrice = null; totalDuration = null; }
      const dateStr = item.date
        ? (typeof item.date === 'string' ? item.date.split('T')[0] : item.date.toISOString().split('T')[0])
        : today;

      return {
        id: item.id,
        date: dateStr,
        customerName: item.customer?.name?.trim() || 'Cliente',
        customerPhone: item.customer?.phoneNumber?.trim() || '',
        customerAvatarUrl: null,
        serviceTitle,
        servicePriceInCents: totalPrice,
        durationMinutes: totalDuration,
        barbermanId: item.barbermanId || '',
        barbermanName: item.barbermanName || '',
        scheduledTime: normalizeTime(item.startTime),
        status,
        hasIncompleteData,
      };
    });

    appointments.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return appointments;
}
