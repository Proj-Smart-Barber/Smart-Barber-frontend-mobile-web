import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { invalidateBookingQueries, bookingQueryKeys } from '../model/booking-query-keys';
import { AGENDA_QUERY_KEYS } from '@/features/agenda/api/agenda.api';

describe('I4 — Invalidação de Cache e Isolamento entre Unidades (booking-cache-invalidation)', () => {
  it('ao aplicar mutação, dados de Shop A são invalidados e Shop B permanece intacto no QueryClient', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 min
          gcTime: 1000 * 60 * 10,
        },
      },
    });

    // Registra dados em cache para Shop A
    queryClient.setQueryData(['barbershop', 'shop-A', 'availability'], { slots: ['10:00'] });
    queryClient.setQueryData(['barbershop', 'shop-A', 'bookings'], [{ id: 'b1' }]);
    queryClient.setQueryData(['agenda', 'day', 'shop-A', 'BARBER', 'staff-1', '2026-10-15'], {
      entries: [{ id: 'b1' }],
    });
    queryClient.setQueryData(['dashboard', 'shop-A'], { total: 10 });
    queryClient.setQueryData(['bookings', 'me', 'user-A', {}], [{ id: 'b1' }]);

    // Registra dados em cache para Shop B
    queryClient.setQueryData(['barbershop', 'shop-B', 'availability'], { slots: ['11:00'] });
    queryClient.setQueryData(['barbershop', 'shop-B', 'bookings'], [{ id: 'b2' }]);
    queryClient.setQueryData(['agenda', 'day', 'shop-B', 'BARBER', 'staff-2', '2026-10-15'], {
      entries: [{ id: 'b2' }],
    });
    queryClient.setQueryData(['dashboard', 'shop-B'], { total: 5 });
    queryClient.setQueryData(['notifications', 'user-A'], [{ id: 'n1' }]);
    queryClient.setQueryData(['notifications', 'user-B'], [{ id: 'n2' }]);

    const isQueryStale = (queryKey: readonly unknown[]) =>
      queryClient.getQueryCache().find({ queryKey })?.isStale();

    // Estado inicial: nenhuma query é stale
    expect(isQueryStale(['barbershop', 'shop-A', 'availability'])).toBe(false);
    expect(isQueryStale(['barbershop', 'shop-B', 'availability'])).toBe(false);

    // Invalida para Shop A e user-A
    await invalidateBookingQueries(queryClient, {
      actorId: 'user-A',
      shopId: 'shop-A',
      bookingId: 'b1',
      dates: ['2026-10-15'],
    });

    // Shop A deve estar marcado como stale
    expect(isQueryStale(['barbershop', 'shop-A', 'availability'])).toBe(true);
    expect(isQueryStale(['barbershop', 'shop-A', 'bookings'])).toBe(true);
    expect(
      isQueryStale(['agenda', 'day', 'shop-A', 'BARBER', 'staff-1', '2026-10-15'])
    ).toBe(true);
    expect(isQueryStale(['dashboard', 'shop-A'])).toBe(true);
    expect(isQueryStale(['notifications', 'user-A'])).toBe(true);

    // Shop B e user-B devem permanecer INTACTOS (não stale)
    expect(isQueryStale(['barbershop', 'shop-B', 'availability'])).toBe(false);
    expect(isQueryStale(['barbershop', 'shop-B', 'bookings'])).toBe(false);
    expect(
      isQueryStale(['agenda', 'day', 'shop-B', 'BARBER', 'staff-2', '2026-10-15'])
    ).toBe(false);
    expect(isQueryStale(['dashboard', 'shop-B'])).toBe(false);
    expect(isQueryStale(['notifications', 'user-B'])).toBe(false);
  });

  it('falha no refetch subsequente à mutação mantém o dado em cache sem disparar nova mutação', async () => {
    const queryClient = new QueryClient();

    // Cache existente
    queryClient.setQueryData(['bookings', 'detail', 'b-applied'], {
      id: 'b-applied',
      status: 'CONFIRMED',
      version: 2,
    });

    // Simula refetch falhando com erro 503
    const refetchFn = vi.fn().mockRejectedValue(new Error('503 Service Unavailable'));

    try {
      await queryClient.fetchQuery({
        queryKey: ['bookings', 'detail', 'b-applied'],
        queryFn: refetchFn,
      });
    } catch {
      // Ignora erro de refetch
    }

    // O dado previamente atualizado continua existindo no cache
    const currentData = queryClient.getQueryData(['bookings', 'detail', 'b-applied']);
    expect(currentData).toEqual(
      expect.objectContaining({ id: 'b-applied', status: 'CONFIRMED', version: 2 })
    );
  });
});
