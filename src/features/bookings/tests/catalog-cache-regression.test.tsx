// @vitest-environment happy-dom
import React from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('@/features/auth', () => ({ useSession: () => ({ identity: { id: 'fixture-client' }, status: 'authenticated', memberships: [], selectedShopId: null }) }));
vi.mock('@/features/barbershop', () => ({ barbershopApi: { getBarbershop: async () => ({ id: 'fixture-shop', timezone: 'America/Sao_Paulo' }) } }));
vi.mock('@/shared/operations/operation-attempt-store', () => ({ operationAttemptStore: { listReferences: async () => [], read: async () => null, save: async () => undefined } }));
import { useBookingFlow } from '@/features/bookings/model/use-booking-flow';
import * as bookingsApi from '@/features/bookings/api/bookings.api';
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; vi.restoreAllMocks(); });
it('reuses the catalog page cache in the booking flow without changing its response shape', () => {
  vi.spyOn(bookingsApi, 'listBarbershopProfessionals').mockResolvedValue([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  clients.push(client);
  const page = { items: [
    { id: 'cut', title: 'Corte', priceInCents: 2000, durationInMinutes: 30, isActive: true },
    { id: 'beard', title: 'Barba', priceInCents: 1500, durationInMinutes: 20, isActive: true },
  ], total: 2, page: 1, limit: 100 };
  client.setQueryData(['services', 'public', 'fixture-shop'], page);
  const { result } = renderHook(() => useBookingFlow({ mode: 'PERSONAL', shopId: 'fixture-shop', initialServiceIds: ['cut','beard'] }), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
  expect(result.current.selectedServices).toHaveLength(2);
  expect(result.current.totalPriceInCents).toBe(3500);
  expect(result.current.totalDurationInMinutes).toBe(50);
  expect(client.getQueryData(['services', 'public', 'fixture-shop'])).toEqual(page);
});
