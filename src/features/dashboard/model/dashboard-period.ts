import { addDays, formatDateLabelShort, parseISODate } from '@/shared/lib/civil-time';
import type { UnitBookingsSummary } from '@/features/bookings/model/unit-bookings.types';

export type DashboardPeriod = 'DAY' | 'WEEK';

export function dashboardDates(date: string, period: DashboardPeriod): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  if (period === 'DAY') return [date];
  const monday = addDays(date, -((parseISODate(date).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function dashboardPeriodLabel(dates: string[]): string {
  if (!dates.length) return 'Sincronizando data…';
  return dates.length === 1 ? formatDateLabelShort(dates[0])
    : `${formatDateLabelShort(dates[0])} — ${formatDateLabelShort(dates[dates.length - 1])}`;
}

export function sumDashboardSummaries(summaries: (UnitBookingsSummary | null | undefined)[]): UnitBookingsSummary | null {
  if (!summaries.length || summaries.some(s => !s)) return null;
  const incomplete = summaries.some(s => s!.hasIncompleteData || s!.totalRevenueInCents == null);
  return {
    totalBookings: summaries.some(s => s!.totalBookings == null) ? null : summaries.reduce((sum, s) => sum + s!.totalBookings!, 0),
    totalRevenueInCents: incomplete ? null : summaries.reduce((sum, s) => sum + s!.totalRevenueInCents!, 0),
    hasIncompleteData: incomplete,
  };
}
