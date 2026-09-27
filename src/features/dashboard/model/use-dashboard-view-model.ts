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
  const { staff, isOwner: sessionIsOwner, signOut, restoreSession } = useSession();
  const [filter, setFilter] = useState<TimelineFilter>('ALL');

  const isOwner = Boolean(sessionIsOwner || staff?.role === 'OWNER');
  const role = isOwner ? 'OWNER' : 'BARBER';
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
    if (isOwner) {
      metricCards.push(
        {
          id: 'revenue',
          title: 'Receita Agendada Hoje',
          value: formatCurrency(metrics.totalRevenueInCents),
          subtitle: `${metrics.totalAppointments} agendamento(s) hoje`,
          tone: 'brand',
          iconName: 'cash-outline',
        },
        {
          id: 'total',
          title: 'Total de Agendamentos',
          value: `${metrics.totalAppointments}`,
          subtitle: metrics.totalAppointments > 0 ? 'Horários reservados' : 'Nenhum agendamento hoje',
          tone: 'neutral',
          iconName: 'calendar-outline',
        },
        {
          id: 'next',
          title: 'Próximo Horário',
          value: nextAppointment?.scheduledTime ?? '--:--',
          subtitle: nextAppointment ? `${nextAppointment.customerName} (${nextAppointment.serviceTitle})` : 'Sem agendamentos pendentes',
          tone: 'brand',
          iconName: 'time-outline',
        },
      );
    } else {
      metricCards.push(
        {
          id: 'appointments',
          title: 'Meus Agendamentos Hoje',
          value: `${metrics.totalAppointments}`,
          subtitle: metrics.totalAppointments > 0 ? 'Horários reservados' : 'Agenda livre hoje',
          tone: 'brand',
          iconName: 'cut-outline',
        },
        {
          id: 'revenue',
          title: 'Total dos Atendimentos',
          value: formatCurrency(metrics.totalRevenueInCents),
          subtitle: 'Soma dos serviços agendados',
          tone: 'success',
          iconName: 'wallet-outline',
        },
        {
          id: 'next',
          title: 'Próximo Atendimento',
          value: nextAppointment?.scheduledTime ?? '--:--',
          subtitle: nextAppointment ? `${nextAppointment.customerName} (${nextAppointment.serviceTitle})` : 'Nenhum pendente',
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
