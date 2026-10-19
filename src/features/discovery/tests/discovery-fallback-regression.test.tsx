// @vitest-environment happy-dom
import React from 'react';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useDiscovery } from '../model/use-discovery';
import { discoveryApi } from '../api/discovery.api';
import { locationStore } from '../model/location-provider';
import { serverClock } from '@/features/bookings/lib/server-clock';

describe('Discovery Fallback and Proximity Regressions', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    serverClock.clear();
    locationStore.clear();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60000 } },
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
    serverClock.clear();
    locationStore.clear();
  });

  it('executa de fato a consulta ALL quando a busca por proximidade retorna 503', async () => {
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55052,
        longitude: -46.633308,
        timestamp: Date.now(),
        accuracyMeters: 10,
        isApproximate: false,
      },
    });

    vi.spyOn(discoveryApi, 'searchNearby').mockRejectedValue(
      Object.assign(new Error('Serviço de proximidade indisponível (503)'), {
        isServiceUnavailable: true,
        statusCode: 503,
      }),
    );

    const searchAllSpy = vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [
        {
          id: '018b1234-5678-7000-8000-000000000001',
          name: 'Barbearia Fallback Geral',
          slug: 'barbearia-fallback-geral',
          location: 'Centro, São Paulo',
          avatarUrl: null,
          distanceMeters: null,
          coordinates: null,
        },
      ],
      page: 1,
      limit: 10,
      total: 1,
      hasNext: false,
      serverTime: '2026-10-19T12:00:00Z',
    });

    const mounted = renderHook(() => useDiscovery({ initialMode: 'NEARBY' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(mounted.result.current.isServiceUnavailable).toBe(true);
    });

    // DEVE ter chamado a consulta ALL no fallback real
    expect(searchAllSpy).toHaveBeenCalled();
    expect(mounted.result.current.effectiveMode).toBe('ALL');
    expect(mounted.result.current.filters.mode).toBe('ALL');
    expect(mounted.result.current.items).toHaveLength(1);
    expect(mounted.result.current.items[0].name).toBe('Barbearia Fallback Geral');
  });
});
