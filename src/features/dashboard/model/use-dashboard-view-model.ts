import { useState } from 'react';
import { useSession } from '@/features/auth';
import type { AppointmentStatus, DashboardAppointment } from '../api/dashboard.contract';
import {
  useDashboardMetricsQuery,
  useTodayAppointmentsQuery,
  useUpdateAppointmentStatusMutation,
} from '../api/dashboard.api';
import {
  findNextAppointment,
  formatCurrency,
  getGreetingByHour,
  mapStatusBadgeTone,
  mapStatusLabel,
} from './dashboard.helpers';
import type { DashboardMetricCardData, TimelineFilter } from './dashboard.types';

export function useDashboardViewModel() {
  const { staff, signOut, restoreSession } = useSession();
  const [filter, setFilter] = useState<TimelineFilter>('ALL');

  const role = staff?.role === 'OWNER' ? 'OWNER' : 'BARBER';
  const staffId = staff?.id ?? 'default-staff-id';

  const metricsQuery = useDashboardMetricsQuery(role, staffId);
  const appointmentsQuery = useTodayAppointmentsQuery(role, staffId);
  const statusMutation = useUpdateAppointmentStatusMutation(role, staffId);

  const rawAppointments = appointmentsQuery.data ?? [];
  const metrics = metricsQuery.data;

  // Filtra lista de agendamentos para a timeline
  const appointments = rawAppointments.filter((a) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') {
      return a.status === 'WAITING' || a.status === 'CONFIRMED' || a.status === 'IN_SERVICE';
    }
    if (filter === 'DONE') {
      return a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'NO_SHOW';
    }
    return true;
  });

  const nextAppointment = findNextAppointment(rawAppointments);

  const greeting = `${getGreetingByHour(new Date().getHours())}, ${staff?.name?.split(' ')[0] ?? 'Profissional'}`;

  // Prepara cards de KPI dependendo do perfil
  const metricCards: DashboardMetricCardData[] = [];

  if (metrics) {
    if (role === 'OWNER') {
      metricCards.push(
        {
          id: 'revenue',
          title: 'Faturamento do Dia',
          value: formatCurrency(metrics.totalRevenueInCents),
          subtitle: `Meta: ${formatCurrency(metrics.targetRevenueInCents)}`,
          tone: 'brand',
          iconName: 'cash-outline',
        },
        {
          id: 'occupancy',
          title: 'Taxa de Ocupação',
          value: `${metrics.occupancyRatePercent}%`,
          subtitle: `${metrics.completedAppointments} de ${metrics.totalAppointments} concluídos`,
          tone: 'success',
          iconName: 'pie-chart-outline',
        },
        {
          id: 'total',
          title: 'Total de Cortes Hoje',
          value: `${metrics.totalAppointments}`,
          subtitle: 'Agendamentos cadastrados',
          tone: 'neutral',
          iconName: 'calendar-outline',
        },
      );
    } else {
      metricCards.push(
        {
          id: 'commission',
          title: 'Comissão Estimada',
          value: formatCurrency(metrics.estimatedCommissionInCents),
          subtitle: '50% sobre os atendimentos',
          tone: 'brand',
          iconName: 'wallet-outline',
        },
        {
          id: 'completed',
          title: 'Meus Atendimentos',
          value: `${metrics.completedAppointments} / ${metrics.totalAppointments}`,
          subtitle: `${metrics.occupancyRatePercent}% concluídos hoje`,
          tone: 'success',
          iconName: 'cut-outline',
        },
        {
          id: 'next',
          title: 'Próximo Atendimento',
          value: nextAppointment?.scheduledTime ?? '--:--',
          subtitle: nextAppointment?.customerName ?? 'Nenhum pendente',
          tone: 'warning',
          iconName: 'time-outline',
        },
      );
    }
  }

  const isLoading = metricsQuery.isLoading || appointmentsQuery.isLoading;
  const isError = metricsQuery.isError || appointmentsQuery.isError;

  const handleUpdateStatus = (id: string, status: AppointmentStatus) => {
    statusMutation.mutate({ id, status });
  };

  const handleRefetch = () => {
    void metricsQuery.refetch();
    void appointmentsQuery.refetch();
    void restoreSession();
  };

  return {
    staff,
    isOwner: role === 'OWNER',
    greeting,
    metricCards,
    appointments,
    totalCount: rawAppointments.length,
    nextAppointment,
    filter,
    setFilter,
    isLoading,
    isError,
    isUpdatingStatus: statusMutation.isPending,
    handleUpdateStatus,
    handleRefetch,
    signOut,
    mapStatusLabel,
    mapStatusBadgeTone,
    formatCurrency,
  };
}
