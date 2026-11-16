// @vitest-environment happy-dom
import React from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import * as api from '@/features/bookings/api/bookings.api';
import type { UnitBookingsState } from '@/features/bookings/model/unit-bookings.types';
import { useDashboardPeriod } from '../model/use-dashboard-period';

const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; vi.restoreAllMocks(); });

it.each(['OWNER', 'BARBERMAN'] as const)('loads six additional days with the same actor and unit scope: %s', async role => {
  const fetch = vi.spyOn(api, 'fetchUnitBookings').mockResolvedValue({
    items: [], summary: { totalBookings: 12, totalRevenueInCents: 12000 },
    page: 1, limit: 3, total: 12, hasNext: true,
  });
  const unit = {
    context: { userId: 'actor', shopId: 'shop', role }, isAuthorized: true,
    clockStatus: 'valid', selectedDate: '2026-11-18', effectiveBarbermanId: role === 'BARBERMAN' ? 'actor' : undefined,
    summary: { totalBookings: 4, totalRevenueInCents: 4000 }, items: [], isLoading: false, isError: false,
  } as unknown as UnitBookingsState;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); clients.push(client);
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(({ mode }) => useDashboardPeriod(unit, mode), { wrapper, initialProps: { mode: 'WEEK' as 'DAY' | 'WEEK' } });
  await waitFor(() => expect(hook.result.current.summary?.totalBookings).toBe(76));
  expect(fetch).toHaveBeenCalledTimes(6);
  for (const [shop, params] of fetch.mock.calls) {
    expect(shop).toBe('shop'); expect(params?.barbermanId).toBe(role === 'BARBERMAN' ? 'actor' : undefined);
    expect(params?.includeSummary).toBe(true); expect(params?.limit).toBe(3);
    expect(params?.date).not.toBe(unit.selectedDate);
  }
  expect(client.getQueryCache().findAll().every(query => query.queryKey.includes('actor') && query.queryKey.includes(role))).toBe(true);
  hook.rerender({ mode: 'DAY' });
  expect(hook.result.current.summary?.totalBookings).toBe(4);
  expect(fetch).toHaveBeenCalledTimes(6);
});
