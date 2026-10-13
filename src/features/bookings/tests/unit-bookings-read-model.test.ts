/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnitBookings } from '../model/use-unit-bookings';
import { serverClock } from '../lib/server-clock';
import * as bookingsApi from '../api/bookings.api';
import type { OperationalContext } from '@/features/auth';
import type { BookingDto, FetchUnitBookingsResponse } from '../api/bookings.dto';

describe('A — Read Model Canônico de Reservas da Unidade (useUnitBookings)', () => {
  const mockContextOwner: OperationalContext = {
    userId: 'user-owner-1',
    shopId: 'shop-alpha-123',
    role: 'OWNER',
    timezone: 'America/Sao_Paulo',
    unitStatus: 'ACTIVE',
  };

  const mockContextBarber: OperationalContext = {
    userId: 'user-barber-2',
    shopId: 'shop-alpha-123',
    role: 'BARBERMAN',
    timezone: 'America/Sao_Paulo',
    unitStatus: 'ACTIVE',
  };

  function createWrapper() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    serverClock.clear();
  });

  afterEach(() => {
    serverClock.clear();
  });

  it('discards a pending page two when page one is invalidated', async () => {
    let resolvePageTwo!: (value: any) => void;
    let refresh = false;
    const page = (id: string) => ({ items: [{ id, barbershopId: mockContextOwner.shopId, barbermanId: 'professional', startTime: '10:00', services: [] }], page: 1, limit: 20, total: 40, hasNext: true, serverTime: '2026-10-13T15:00:00Z' });
    vi.spyOn(bookingsApi, 'fetchUnitBookings').mockImplementation(async (_shop, params) => {
      if (params?.page === 2) return new Promise(resolve => { resolvePageTwo = resolve; });
      return page(refresh ? 'new-page-one' : 'old-page-one');
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client }, children);
    const hook = renderHook(() => useUnitBookings(mockContextOwner, { date: '2026-10-13' }), { wrapper });
    const peer = renderHook(() => useUnitBookings(mockContextOwner, { date: '2026-10-13' }), { wrapper });
    await waitFor(() => expect(hook.result.current.items[0]?.id).toBe('old-page-one'));
    await waitFor(() => expect(peer.result.current.items[0]?.id).toBe('old-page-one'));
    let pending!: Promise<void>;
    act(() => { pending = hook.result.current.loadMore(); });
    await waitFor(() => expect(resolvePageTwo).toBeDefined());
    refresh = true;
    await act(async () => { await client.invalidateQueries({ queryKey: ['barbershop'] }); });
    await waitFor(() => expect(hook.result.current.items[0]?.id).toBe('new-page-one'));
    await act(async () => { resolvePageTwo(page('late-page-two')); await pending; });
    expect(hook.result.current.items.map(b => b.id)).toEqual(['new-page-one']);
    expect(peer.result.current.items.map(b => b.id)).toEqual(['new-page-one']);
    peer.unmount();
    hook.unmount(); client.clear();
  });

  it('updates authoritative today and following selection across midnight', async () => {
    vi.spyOn(bookingsApi, 'fetchUnitBookings').mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, hasNext: false, serverTime: '2026-10-14T02:59:00Z' });
    const hook = renderHook(() => useUnitBookings(mockContextOwner), { wrapper: createWrapper() });
    await waitFor(() => expect(hook.result.current.unitTodayDate).toBe('2026-10-13'));
    await waitFor(() => expect(hook.result.current.selectedDate).toBe('2026-10-13'));

    act(() => { serverClock.syncWithServer('2026-10-14T03:01:00Z', { force: true }); });
    await waitFor(() => expect(hook.result.current.unitTodayDate).toBe('2026-10-14'), { timeout: 4000 });
    expect(hook.result.current.selectedDate).toBe('2026-10-14');
    hook.unmount();
  });

  it('does not advance an explicitly chosen date at midnight', async () => {
    vi.spyOn(bookingsApi, 'fetchUnitBookings').mockResolvedValue({ items: [], page: 1, limit: 20, total: 0, hasNext: false, serverTime: '2026-10-14T02:59:00Z' });
    const hook = renderHook(() => useUnitBookings(mockContextOwner, { date: '2026-10-13' }), { wrapper: createWrapper() });
    await waitFor(() => expect(hook.result.current.unitTodayDate).toBe('2026-10-13'));
    act(() => serverClock.syncWithServer('2026-10-14T03:01:00Z', { force: true }));
    await waitFor(() => expect(hook.result.current.unitTodayDate).toBe('2026-10-14'), { timeout: 4000 });
    expect(hook.result.current.selectedDate).toBe('2026-10-13');
    act(() => hook.result.current.followToday());
    expect(hook.result.current.selectedDate).toBe('2026-10-14');
    hook.unmount();
  });

  it('falha fechado para contexto nulo ou sem papel autorizado', async () => {
    const { result: nullResult } = renderHook(() => useUnitBookings(null), {
      wrapper: createWrapper(),
    });

    expect(nullResult.current.items).toEqual([]);
    expect(nullResult.current.total).toBe(0);
    expect(nullResult.current.clockStatus).toBe('error');

    const unauthorizedContext = { ...mockContextOwner, role: 'CLIENT' as any };
    const { result: unauthResult } = renderHook(() => useUnitBookings(unauthorizedContext), {
      wrapper: createWrapper(),
    });

    expect(unauthResult.current.items).toEqual([]);
    expect(unauthResult.current.total).toBe(0);
    expect(unauthResult.current.clockStatus).toBe('error');
  });

  it('restringe BARBERMAN estritamente à própria agenda e permite OWNER filtrar profissional ou equipe', async () => {
    const fetchSpy = vi.spyOn(bookingsApi, 'fetchUnitBookings').mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      hasNext: false,
      serverTime: '2026-10-13T15:00:00.000Z',
    });

    // BARBERMAN tentando passar filtro de colega: deve ser ignorado e usar seu próprio userId
    const { result: barberResult } = renderHook(
      () => useUnitBookings(mockContextBarber, { barbermanId: 'barber-outro-999' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(barberResult.current.clockStatus).toBe('valid');
    });

    expect(barberResult.current.selectedProfessionalId).toBe('user-barber-2');

    // OWNER pode iniciar sem filtro (equipe completa) e depois filtrar
    const { result: ownerResult } = renderHook(
      () => useUnitBookings(mockContextOwner),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(ownerResult.current.clockStatus).toBe('valid');
    });

    expect(ownerResult.current.selectedProfessionalId).toBeUndefined();

    act(() => {
      ownerResult.current.filterByProfessional('barber-carlos');
    });

    expect(ownerResult.current.selectedProfessionalId).toBe('barber-carlos');
  });

  it('deduplica itens por ID e preserva version, instantes, timezone, capabilities e summary', async () => {
    const mockBookings: BookingDto[] = [
      {
        id: 'bk-1',
        barbershopId: 'shop-alpha-123',
        barbermanId: 'user-barber-2',
        date: '2026-10-13',
        startTime: '10:00',
        endTime: '10:30',
        startsAt: '2026-10-13T10:00:00.000-03:00',
        endsAt: '2026-10-13T10:30:00.000-03:00',
        timezone: 'America/Sao_Paulo',
        version: 2,
        status: 'CONFIRMED',
        capabilities: {
          reschedule: { allowed: true },
          cancel: { allowed: true },
        },
        services: [{ title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
      },
      // Duplicata com mesmo id
      {
        id: 'bk-1',
        barbershopId: 'shop-alpha-123',
        barbermanId: 'user-barber-2',
        date: '2026-10-13',
        startTime: '10:00',
        endTime: '10:30',
        version: 2,
        status: 'CONFIRMED',
        services: [],
      },
      {
        id: 'bk-2',
        barbershopId: 'shop-alpha-123',
        barbermanId: 'user-barber-2',
        date: '2026-10-13',
        startTime: '11:00',
        endTime: '11:45',
        version: 1,
        status: 'CONFIRMED',
        services: [{ title: 'Barba', priceInCents: 3500, durationInMinutes: 45 }],
      },
    ];

    vi.spyOn(bookingsApi, 'fetchUnitBookings').mockResolvedValue({
      items: mockBookings,
      page: 1,
      limit: 20,
      total: 2,
      hasNext: false,
      serverTime: '2026-10-13T13:00:00.000Z',
      summary: {
        totalBookings: 2,
        totalRevenueInCents: 8500,
        hasIncompleteData: false,
      },
    });

    const { result } = renderHook(
      () => useUnitBookings(mockContextOwner, { date: '2026-10-13' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.items.length).toBe(2);
    });

    expect(result.current.items[0].id).toBe('bk-1');
    expect(result.current.items[0].version).toBe(2);
    expect(result.current.items[0].timezone).toBe('America/Sao_Paulo');
    expect(result.current.items[0].capabilities?.cancel?.allowed).toBe(true);
    expect(result.current.items[1].id).toBe('bk-2');
    expect(result.current.summary?.totalRevenueInCents).toBe(8500);
    expect(result.current.total).toBe(2);
    expect(result.current.isPartial).toBe(false);
  });

  it('determina data civil e próximo atendimento com base em tempo autoritativo e timezone da unidade', async () => {
    // 2026-10-14 01:30:00 UTC = 2026-10-13 22:30:00 em São Paulo
    const serverTimestampMs = Date.UTC(2026, 9, 14, 1, 30, 0);
    serverClock.syncWithServer(serverTimestampMs);

    const items: BookingDto[] = [
      {
        id: 'bk-earlier',
        barbershopId: 'shop-alpha-123',
        barbermanId: 'user-barber-2',
        startTime: '21:00',
        status: 'COMPLETED',
        services: [],
      },
      {
        id: 'bk-next',
        barbershopId: 'shop-alpha-123',
        barbermanId: 'user-barber-2',
        startTime: '22:45',
        status: 'CONFIRMED',
        customer: { id: 'c-1', name: 'Carlos' },
        services: [{ title: 'Corte' }],
      },
    ];

    vi.spyOn(bookingsApi, 'fetchUnitBookings').mockResolvedValue({
      items,
      page: 1,
      limit: 20,
      total: 2,
      hasNext: false,
      serverTime: new Date(serverTimestampMs).toISOString(),
    });

    const { result } = renderHook(
      () => useUnitBookings(mockContextOwner, { date: '2026-10-13' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.items.length).toBe(2);
    });

    expect(result.current.today).toBe('2026-10-13');
    expect(result.current.nextAppointment?.id).toBe('bk-next');
    expect(result.current.nextAppointment?.startTime).toBe('22:45');
    expect(result.current.nextAppointmentState).toBe('found');
  });

  it('nunca declara falsamente ausência de próximo atendimento se a lista for parcial', async () => {
    const serverTimestampMs = Date.UTC(2026, 9, 13, 17, 0, 0); // 14:00 em SP
    serverClock.syncWithServer(serverTimestampMs);

    // Página 1 só traz um item passado, mas hasNext é true (ou items.length < total)
    const items: BookingDto[] = [
      {
        id: 'bk-past',
        barbershopId: 'shop-alpha-123',
        barbermanId: 'user-barber-2',
        startTime: '09:00',
        status: 'COMPLETED',
        services: [],
      },
    ];

    vi.spyOn(bookingsApi, 'fetchUnitBookings').mockResolvedValue({
      items,
      page: 1,
      limit: 1,
      total: 5,
      hasNext: true,
      serverTime: new Date(serverTimestampMs).toISOString(),
    });

    const { result } = renderHook(
      () => useUnitBookings(mockContextOwner, { date: '2026-10-13' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    expect(result.current.isPartial).toBe(true);
    // Não deve dizer que "não há próximo atendimento", e sim indeterminate
    expect(result.current.nextAppointment).toBeNull();
    expect(result.current.nextAppointmentState).toBe('indeterminate');
  });

  it('captura loadMoreError e expõe para a interface quando paginação falha', async () => {
    const fetchSpy = vi.spyOn(bookingsApi, 'fetchUnitBookings').mockImplementation(async (_shopId, params) => {
      if (params?.page === 2) {
        throw new Error('Erro de conexão ao carregar mais agendamentos');
      }
      return {
        items: [
          {
            id: 'bk-1',
            barbershopId: 'shop-alpha-123',
            barbermanId: 'user-barber-2',
            date: '2026-10-13',
            startTime: '08:00',
            services: [],
          },
        ],
        page: 1,
        limit: 1,
        total: 2,
        hasNext: true,
        serverTime: '2026-10-13T12:00:00.000Z',
      };
    });

    const { result } = renderHook(
      () => useUnitBookings(mockContextOwner, { date: '2026-10-13' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.loadMoreError).toBeNull();

    // Dispara carregamento da próxima página
    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loadMoreError).toContain('Erro de conexão ao carregar mais agendamentos');
    });

    // Mantém a página 1 intacta
    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].id).toBe('bk-1');
  });
});
