import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardMockAdapter } from './dashboard.mock';
import { DashboardHttpAdapter } from './dashboard.http';
import { ENV } from '../../../shared/config/env';
// Port / Adapter singleton: usa DashboardHttpAdapter em produção/HTTP e MockAdapter apenas se configurado mock
export const dashboardRepository = ENV.AVAILABILITY_SOURCE === 'mock'
    ? new DashboardMockAdapter()
    : new DashboardHttpAdapter();
export const DASHBOARD_QUERY_KEYS = {
    metrics: (role, staffId, shopId) => ['dashboard', 'metrics', role, staffId, shopId],
    appointments: (role, staffId, shopId) => ['dashboard', 'appointments', role, staffId, shopId],
};
export function useDashboardMetricsQuery(role, staffId, shopId, timezone) {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.metrics(role, staffId, shopId),
        queryFn: () => dashboardRepository.getMetrics({ role, staffId, shopId, timezone }),
        staleTime: 1000 * 60 * 2, // 2 minutos
    });
}
export function useTodayAppointmentsQuery(role, staffId, shopId, timezone) {
    return useQuery({
        queryKey: DASHBOARD_QUERY_KEYS.appointments(role, staffId, shopId),
        queryFn: () => dashboardRepository.getTodayAppointments({ role, staffId, shopId, timezone }),
        staleTime: 1000 * 60 * 2, // 2 minutos
    });
}
export function useUpdateAppointmentStatusMutation(role, staffId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }) => dashboardRepository.updateAppointmentStatus(id, status),
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
