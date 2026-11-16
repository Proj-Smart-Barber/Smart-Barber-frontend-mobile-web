import { describe, expect, it } from 'vitest';
import { dashboardDates, sumDashboardSummaries } from '../model/dashboard-period';

describe('Dashboard periods', () => {
  it('uses a complete Monday–Sunday civil week, including Sunday and month boundaries', () => {
    expect(dashboardDates('2026-11-15', 'WEEK')).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
    expect(dashboardDates('2026-12-01', 'WEEK')[0]).toBe('2026-11-30');
    expect(dashboardDates('2026-11-16', 'DAY')).toEqual(['2026-11-16']);
    expect(dashboardDates('', 'WEEK')).toEqual([]);
  });
  it('uses full server summaries rather than counting the limited preview', () => {
    expect(sumDashboardSummaries([
      { totalBookings: 30, totalRevenueInCents: 150000 },
      { totalBookings: 20, totalRevenueInCents: 100000 },
    ])).toMatchObject({ totalBookings: 50, totalRevenueInCents: 250000 });
  });
  it('never presents missing or incomplete days as zero revenue', () => {
    expect(sumDashboardSummaries([null, { totalBookings: 0, totalRevenueInCents: 0 }])).toBeNull();
    expect(sumDashboardSummaries([{ totalBookings: 2, totalRevenueInCents: null }])).toMatchObject({ totalBookings: 2, totalRevenueInCents: null, hasIncompleteData: true });
  });
});
