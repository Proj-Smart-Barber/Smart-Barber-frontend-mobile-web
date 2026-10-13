import { useMemo, useState } from 'react';
import { useSession, getOperationalContext } from '@/features/auth';
import type { AppointmentStatus, DashboardAppointment } from '../api/dashboard.contract';
import { useUnitBookings } from '@/features/bookings/model/use-unit-bookings';
import { projectDashboardAppointments } from '../api/dashboard.http';
import {
  findNextAppointment,
  formatCurrency,
  getGreetingByHour,
  mapStatusBadgeTone,
  mapStatusLabel,
} from './dashboard.helpers';
import type { DashboardMetricCardData, TimelineFilter } from './dashboard.types';

export function useDashboardViewModel() {
  const session = useSession();
  const { staff, signOut, restoreSession } = session;
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const context = getOperationalContext(session);
  const isOwner = context?.role === 'OWNER';
  const role = isOwner ? 'OWNER' : 'BARBER';
  const unit = useUnitBookings(context);
  const rawAppointments = useMemo(() => projectDashboardAppointments(unit.items, unit.selectedDate), [unit.items, unit.selectedDate]);
  const metrics = unit.summary ? {
    totalRevenueInCents: unit.summary.hasIncompleteData || unit.summary.totalRevenueInCents === null ? null : unit.summary.totalRevenueInCents,
    totalAppointments: unit.summary.totalBookings ?? null,
  } : undefined;

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

  const nextAppointment = unit.nextAppointment ? rawAppointments.find(a => a.id === unit.nextAppointment!.id) ?? null : null;

  // Prévia enxuta do dia: até 3 agendamentos, excluindo o destaque atual
  const previewAppointments = useMemo(() => {
    const remaining = nextAppointment
      ? rawAppointments.filter((a) => a.id !== nextAppointment.id)
      : rawAppointments;
    return remaining.slice(0, 3);
  }, [rawAppointments, nextAppointment]);

  const greeting = `${getGreetingByHour(new Date().getHours())}, ${staff?.name?.split(' ')[0] ?? 'Profissional'}`;

  // Resumo compacto do dia: no máximo dois indicadores essenciais, sem duplicar o próximo horário
  const metricCards: DashboardMetricCardData[] = [];

  if (metrics) {
    if (isOwner) {
      metricCards.push(
        {
          id: 'revenue',
          title: 'Valores das Reservas',
          value: formatCurrency(metrics.totalRevenueInCents),
          subtitle: `Soma das reservas no filtro (${metrics.totalAppointments} agendamento(s))`,
          tone: 'brand',
          iconName: 'cash-outline',
        },
        {
          id: 'total',
          title: 'Total de Agendamentos',
          value: metrics.totalAppointments === null ? 'A confirmar' : `${metrics.totalAppointments}`,
          subtitle: metrics.totalAppointments === null ? 'Resumo indisponível' : metrics.totalAppointments > 0 ? 'Horários reservados' : 'Nenhum agendamento hoje',
          tone: 'neutral',
          iconName: 'calendar-outline',
        },
      );
    } else {
      metricCards.push(
        {
          id: 'appointments',
          title: 'Meus Agendamentos Hoje',
          value: metrics.totalAppointments === null ? 'A confirmar' : `${metrics.totalAppointments}`,
          subtitle: metrics.totalAppointments === null ? 'Resumo indisponível' : metrics.totalAppointments > 0 ? 'Horários reservados' : 'Agenda livre hoje',
          tone: 'brand',
          iconName: 'cut-outline',
        },
        {
          id: 'revenue',
          title: 'Valores das Reservas',
          value: formatCurrency(metrics.totalRevenueInCents),
          subtitle: 'Soma das reservas no filtro',
          tone: 'success',
          iconName: 'wallet-outline',
        },
      );
    }
  }

  const isLoading = unit.isLoading || unit.clockStatus === 'syncing';
  const isError = !context || unit.isError || unit.clockStatus === 'error';
  const handleUpdateStatus = (_id: string, _status: AppointmentStatus) => {};
  const handleRefetch = () => { void unit.refetch(); void restoreSession(); };

  return {
    staff,
    isOwner: role === 'OWNER',
    greeting,
    metricCards,
    appointments,
    previewAppointments,
    totalCount: unit.total ?? rawAppointments.length,
    isIndeterminate: unit.isPartial || unit.clockStatus !== 'valid',
    nextAppointment,
    filter,
    setFilter,
    isLoading,
    isError,
    isUpdatingStatus: false,
    handleUpdateStatus,
    handleRefetch,
    signOut,
    mapStatusLabel,
    mapStatusBadgeTone,
    formatCurrency,
  };
}
