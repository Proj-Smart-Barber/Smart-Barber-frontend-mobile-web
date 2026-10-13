/**
 * Contratos e tipos de dados do Dashboard
 * Espelha conceitualmente o schema Drizzle do banco PostgreSQL
 */

export type AppointmentStatus =
  | 'WAITING'
  | 'CONFIRMED'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'UNKNOWN';

export interface DashboardAppointment {
  id: string;
  date?: string;
  customerName: string;
  customerPhone: string;
  customerAvatarUrl?: string | null;
  serviceTitle: string;
  servicePriceInCents: number | null;
  durationMinutes: number | null;
  barbermanId: string;
  barbermanName: string;
  scheduledTime: string; // ex: "09:00", "10:30"
  status: AppointmentStatus;
  hasIncompleteData?: boolean;
}

export interface DashboardMetrics {
  totalRevenueInCents: number | null;
  targetRevenueInCents: number | null;
  estimatedCommissionInCents: number | null;
  totalAppointments: number;
  completedAppointments: number;
  occupancyRatePercent: number | null;
  hasIncompleteData?: boolean;
}

export interface IDashboardRepository {
  getMetrics(params: { role: 'OWNER' | 'BARBER'; staffId: string; shopId?: string | null; timezone?: string }): Promise<DashboardMetrics>;
  getTodayAppointments(params: { role: 'OWNER' | 'BARBER'; staffId: string; shopId?: string | null; timezone?: string }): Promise<DashboardAppointment[]>;
  updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<DashboardAppointment>;
}
