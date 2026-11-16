import { useQueries } from '@tanstack/react-query';
import { fetchUnitBookings } from '@/features/bookings/api/bookings.api';
import { bookingQueryKeys } from '@/features/bookings/model/booking-query-keys';
import type { UnitBookingsState } from '@/features/bookings/model/unit-bookings.types';
import { projectDashboardAppointments } from '../api/dashboard.http';
import { dashboardDates, sumDashboardSummaries, type DashboardPeriod } from './dashboard-period';

export function useDashboardPeriod(unit: UnitBookingsState, period: DashboardPeriod) {
  const dates = dashboardDates(unit.selectedDate, period);
  const otherDates = period === 'WEEK' ? dates.filter(date => date !== unit.selectedDate) : [];
  const context = unit.context;
  const results = useQueries({ queries: otherDates.map(date => {
    const params = { date, barbermanId: unit.effectiveBarbermanId, page: 1, limit: 3, includeSummary: true };
    return {
      queryKey: bookingQueryKeys.unitBookings(context?.shopId ?? '', params, context?.userId, context?.role),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchUnitBookings(context!.shopId, params, { signal, skipAutoSyncClock: true }),
      enabled: unit.isAuthorized && unit.clockStatus === 'valid',
      staleTime: 30_000,
    };
  }) });
  const summary = period === 'DAY' ? unit.summary : sumDashboardSummaries([unit.summary, ...results.map(result => result.data?.summary)]);
  const appointments = [
    ...projectDashboardAppointments(unit.items, unit.selectedDate),
    ...results.flatMap((result, index) => projectDashboardAppointments(result.data?.items ?? [], otherDates[index])),
  ].sort((a, b) => `${a.date} ${a.scheduledTime}`.localeCompare(`${b.date} ${b.scheduledTime}`));
  return {
    dates, summary, appointments,
    isLoading: unit.isLoading || results.some(result => result.isPending),
    isError: unit.isError || results.some(result => result.isError),
    refetch: async () => { await Promise.all([unit.refetch(), ...results.map(result => result.refetch())]); },
  };
}
