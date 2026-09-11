import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AppointmentStatus,
  DashboardAppointment,
  DashboardMetrics,
  IDashboardRepository,
} from './dashboard.contract';
import { DashboardMockAdapter } from './dashboard.mock';

// Port / Adapter singleton (pode ser substituído por DashboardHttpAdapter quando a API estiver pronta)
export const dashboardRepository: IDashboardRepository = new DashboardMockAdapter();

export const DASHBOARD_QUERY_KEYS = {
  metrics: (role: string, staffId: string) => ['dashboard', 'metrics', role, staffId] as const,
  appointments: (role: string, staffId: string) => ['dashboard', 'appointments', role, staffId] as const,
};

export function useDashboardMetricsQuery(role: 'OWNER' | 'BARBER', staffId: string) {
  return useQuery<DashboardMetrics>({
    queryKey: DASHBOARD_QUERY_KEYS.metrics(role, staffId),
    queryFn: () => dashboardRepository.getMetrics({ role, staffId }),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useTodayAppointmentsQuery(role: 'OWNER' | 'BARBER', staffId: string) {
  return useQuery<DashboardAppointment[]>({
    queryKey: DASHBOARD_QUERY_KEYS.appointments(role, staffId),
    queryFn: () => dashboardRepository.getTodayAppointments({ role, staffId }),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useUpdateAppointmentStatusMutation(role: 'OWNER' | 'BARBER', staffId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      dashboardRepository.updateAppointmentStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: DASHBOARD_QUERY_KEYS.appointments(role, staffId),
      });
      void queryClient.invalidateQueries({
        queryKey: DASHBOARD_QUERY_KEYS.metrics(role, staffId),
      });
    },
  });
}
