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
  | 'NO_SHOW';

export interface DashboardAppointment {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAvatarUrl?: string | null;
  serviceTitle: string;
  servicePriceInCents: number;
  durationMinutes: number;
  barbermanId: string;
  barbermanName: string;
  scheduledTime: string; // ex: "09:00", "10:30"
  status: AppointmentStatus;
}

export interface DashboardMetrics {
  totalRevenueInCents: number;
  targetRevenueInCents: number;
  estimatedCommissionInCents: number;
  totalAppointments: number;
  completedAppointments: number;
  occupancyRatePercent: number;
}

export interface IDashboardRepository {
  getMetrics(params: { role: 'OWNER' | 'BARBER'; staffId: string }): Promise<DashboardMetrics>;
  getTodayAppointments(params: { role: 'OWNER' | 'BARBER'; staffId: string }): Promise<DashboardAppointment[]>;
  updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<DashboardAppointment>;
}
