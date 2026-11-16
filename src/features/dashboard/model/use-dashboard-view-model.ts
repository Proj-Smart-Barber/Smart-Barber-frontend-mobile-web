import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSession, getOperationalContext } from '@/features/auth';
import type { AppointmentStatus } from '../api/dashboard.contract';
import { useUnitBookings } from '@/features/bookings/model/use-unit-bookings';
import { useOwnerReviewSummary } from '@/features/reviews';
import {
  formatCurrency,
  getGreetingByHour,
  mapStatusBadgeTone,
  mapStatusLabel,
} from './dashboard.helpers';
import { useDashboardPeriod } from './use-dashboard-period';
import { dashboardPeriodLabel, type DashboardPeriod } from './dashboard-period';
import type { DashboardMetricCardData, TimelineFilter } from './dashboard.types';

export function useDashboardViewModel() {
  const router = useRouter();
  const session = useSession();
  const { staff, signOut, restoreSession } = session;
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const context = getOperationalContext(session);
  const isOwner = context?.role === 'OWNER';
  const role = isOwner ? 'OWNER' : 'BARBER';
  const unit = useUnitBookings(context);
  const [period, setPeriod] = useState<DashboardPeriod>('DAY');
  const periodData = useDashboardPeriod(unit, period);
  const isToday = period === 'DAY' && unit.selectedDate === unit.unitTodayDate;

  const shopId = session.barbershop?.id;
  const { data: reviewSummary } = useOwnerReviewSummary(
    shopId,
    { source: 'ALL' },
    { enabled: Boolean(isOwner && shopId) },
  );
  const rawAppointments = periodData.appointments;
  const metrics = periodData.summary ? {
    totalRevenueInCents: periodData.summary.hasIncompleteData || periodData.summary.totalRevenueInCents === null ? null : periodData.summary.totalRevenueInCents,
    totalAppointments: periodData.summary.totalBookings ?? null,
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

  const nextAppointment = isToday && unit.nextAppointment ? rawAppointments.find(a => a.id === unit.nextAppointment!.id) ?? null : null;

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
          subtitle: metrics.totalAppointments === null ? 'Resumo indisponível' : metrics.totalAppointments > 0 ? 'Horários reservados' : isToday ? 'Nenhum agendamento hoje' : 'Nenhum agendamento no período',
          tone: 'neutral',
          iconName: 'calendar-outline',
        },
      );

      if (reviewSummary?.metrics) {
        const avg = reviewSummary.metrics.averageRating;
        metricCards.push({
          id: 'reviews',
          title: 'Avaliações gerais',
          value: avg !== null ? `${avg.toFixed(1)} ★` : 'Sem notas',
          subtitle: `${reviewSummary.metrics.reviewCount} avaliaç${reviewSummary.metrics.reviewCount === 1 ? 'ão' : 'ões'} • Todas as datas`,
          tone: 'brand',
          iconName: 'star-outline',
          onPress: () => router.push('/(app)/reviews'),
        });
      }
    } else {
      metricCards.push(
        {
          id: 'appointments',
          title: isToday ? 'Meus Agendamentos Hoje' : period === 'WEEK' ? 'Meus Agendamentos na Semana' : 'Meus Agendamentos no Dia',
          value: metrics.totalAppointments === null ? 'A confirmar' : `${metrics.totalAppointments}`,
          subtitle: metrics.totalAppointments === null ? 'Resumo indisponível' : metrics.totalAppointments > 0 ? 'Horários reservados' : isToday ? 'Agenda livre hoje' : 'Agenda livre no período',
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

  const isLoading = periodData.isLoading || unit.clockStatus === 'syncing';
  const isError = !context || periodData.isError || unit.clockStatus === 'error';
  const handleUpdateStatus = (_id: string, _status: AppointmentStatus) => {};
  const handleRefetch = () => { void periodData.refetch(); void restoreSession(); };

  return {
    staff,
    period, setPeriod,
    selectedDate: unit.selectedDate,
    todayIso: unit.unitTodayDate ?? '',
    selectDate: unit.setSelectedDate,
    goToToday: () => { setPeriod('DAY'); unit.followToday(); },
    dateLabel: dashboardPeriodLabel(periodData.dates),
    isToday,
    isOwner: role === 'OWNER',
    greeting,
    metricCards,
    appointments,
    previewAppointments,
    totalCount: periodData.summary?.totalBookings ?? rawAppointments.length,
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
