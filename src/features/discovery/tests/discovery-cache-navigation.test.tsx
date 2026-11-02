// @vitest-environment happy-dom
import React from 'react';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useDiscovery } from '../model/use-discovery';
import { discoveryApi } from '../api/discovery.api';
import { locationStore } from '../model/location-provider';
import { serverClock } from '@/features/bookings/lib/server-clock';

describe('Discovery Cache & Navigation Preservation Regressions', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    serverClock.clear();
    locationStore.clear();
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60000, staleTime: 60000 } },
    });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.restoreAllMocks();
    serverClock.clear();
    locationStore.clear();
  });

  it('preserva dados em cache e evita novas chamadas de rede ao alternar entre telas com mesma localização', async () => {
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55052,
        longitude: -46.633308,
        timestamp: Date.now(),
        accuracyMeters: 10,
        isApproximate: false,
        formattedLocation: 'Centro, São Paulo',
      },
    });

    const mockShop = {
      id: 'shop-cache-1',
      name: 'Barbearia Mooca Estilo',
      slug: 'barbearia-mooca-estilo',
      location: 'Mooca, São Paulo',
      avatarUrl: null,
      coverUrl: null,
      photos: [],
      rating: 4.8,
      reviewCount: 10,
      googleMapsUrl: null,
      coordinates: { latitude: -23.55, longitude: -46.63 },
      distanceMeters: 500,
    };

    const nearbySpy = vi.spyOn(discoveryApi, 'searchNearby').mockResolvedValue({
      items: [mockShop],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: new Date().toISOString(),
    });

    // 1. Simula montagem da tela Home
    const { result: homeResult, unmount: unmountHome } = renderHook(() => useDiscovery({ initialRadius: 10 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(homeResult.current.effectiveMode).toBe('NEARBY');
      expect(homeResult.current.items).toHaveLength(1);
    });

    expect(nearbySpy).toHaveBeenCalledTimes(1);

    // 2. Simula navegação para Explorar (unmount Home)
    unmountHome();

    // 3. Simula montagem da tela Explorar reutilizando o mesmo cache do React Query
    const { result: exploreResult, unmount: unmountExplore } = renderHook(
      () => useDiscovery({ initialRadius: 10 }),
      { wrapper },
    );

    // Dados devem estar disponíveis de imediato a partir do cache sem refetch de rede duplicado
    expect(exploreResult.current.items).toHaveLength(1);
    expect(exploreResult.current.items[0].name).toBe('Barbearia Mooca Estilo');
    expect(nearbySpy).toHaveBeenCalledTimes(1);

    unmountExplore();
  });

  it('permite transição rápida para modo ALL com fallback quando a busca por proximidade retorna 0 barbearias no raio', async () => {
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

    vi.spyOn(discoveryApi, 'searchNearby').mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      hasNext: false,
      serverTime: new Date().toISOString(),
    });

    const searchAllSpy = vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [
        {
          id: 'shop-all-1',
          name: 'Barbearia Geral Rede',
          slug: 'barbearia-geral-rede',
          location: 'São Paulo',
          avatarUrl: null,
          coverUrl: null,
          photos: [],
          rating: 4.5,
          reviewCount: 3,
          googleMapsUrl: null,
          coordinates: null,
          distanceMeters: null,
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: new Date().toISOString(),
    });

    const { result } = renderHook(() => useDiscovery({ initialRadius: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(0);
    });

    // Usuário ou UI dispara setMode('ALL') para ver todas as barbearias
    act(() => {
      result.current.setMode('ALL');
    });

    await waitFor(() => {
      expect(result.current.effectiveMode).toBe('ALL');
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe('Barbearia Geral Rede');
    });

    expect(searchAllSpy).toHaveBeenCalled();
  });
});
