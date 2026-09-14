export type {
  AppointmentStatus,
  DashboardAppointment,
  DashboardMetrics,
  IDashboardRepository,
} from '../api/dashboard.contract';

export interface DashboardMetricCardData {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'brand' | 'success' | 'warning' | 'neutral';
  iconName: string;
}

export type TimelineFilter = 'ALL' | 'PENDING' | 'DONE';
