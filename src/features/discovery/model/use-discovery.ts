import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { serverClock } from '@/features/bookings/lib/server-clock';
import { discoveryApi } from '../api/discovery.api';
import { locationStore, type LocationSession } from './location-provider';
import type {
  DiscoveryMode,
  DiscoveryRadius,
  DiscoveryFilters,
  UseDiscoveryViewModel,
} from './discovery.types';
import type { PublicShop } from '../api/discovery.contract';

export function useDiscovery(initialParams?: {
  initialMode?: DiscoveryMode;
  initialRadius?: DiscoveryRadius;
  initialQuery?: string;
}): UseDiscoveryViewModel {
  const [filters, setFilters] = useState<DiscoveryFilters>(() => {
    const currentLoc = locationStore.getSession();
    const defaultMode =
      initialParams?.initialMode ??
      (currentLoc.state === 'granted' && currentLoc.coords !== null ? 'NEARBY' : 'ALL');
    return {
      mode: defaultMode,
      radiusKm: initialParams?.initialRadius ?? 10,
      searchQuery: initialParams?.initialQuery ?? '',
    };
  });

  const [debouncedQuery, setDebouncedQuery] = useState(filters.searchQuery);

  // Debounce 300ms na digitação da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(filters.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // Inscrição reativa ao store de localização efêmera
  const [locationSession, setLocationSession] = useState<LocationSession>(() =>
    locationStore.getSession(),
  );

  useEffect(() => {
    return locationStore.subscribe((session) => {
      setLocationSession(session);
      if (
        session.state === 'denied' ||
        session.state === 'unavailable' ||
        session.state === 'timeout' ||
        session.state === 'stale' ||
        session.state === 'idle'
      ) {
        setFilters((prev) => (prev.mode === 'NEARBY' ? { ...prev, mode: 'ALL' } : prev));
      }
    });
  }, []);

  const requestLocation = useCallback(async () => {
    const session = await locationStore.requestCurrentPosition();
    if (session.state === 'granted' && session.coords !== null) {
      setFilters((prev) => ({
        ...prev,
        mode: 'NEARBY',
        radiusKm: prev.radiusKm || 10,
      }));
    } else {
      setFilters((prev) => (prev.mode === 'NEARBY' ? { ...prev, mode: 'ALL' } : prev));
    }
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const [proximityUnavailable, setProximityUnavailable] = useState(false);

  const setMode = useCallback((mode: DiscoveryMode) => {
    if (mode === 'NEARBY') {
      setProximityUnavailable(false);
    }
    setFilters((prev) => ({ ...prev, mode }));
  }, []);

  const setRadiusKm = useCallback((radiusKm: DiscoveryRadius) => {
    setFilters((prev) => ({ ...prev, radiusKm }));
  }, []);

  const isNearbyEligible =
    filters.mode === 'NEARBY' &&
    !proximityUnavailable &&
    locationSession.state === 'granted' &&
    locationSession.coords !== null;

  // Chave de query estritamente opaca (NUNCA incluir coordenadas em query keys!)
  const queryKey = useMemo(() => {
    if (isNearbyEligible) {
      return [
        'discovery',
        'nearby',
        locationSession.generationId,
        filters.radiusKm,
        debouncedQuery.trim(),
      ] as const;
    }
    return ['discovery', 'all', debouncedQuery.trim()] as const;
  }, [
    isNearbyEligible,
    filters.radiusKm,
    debouncedQuery,
    locationSession.generationId,
  ]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      const expectedGeneration = serverClock.getGeneration();
      if (isNearbyEligible && locationSession.coords) {
        try {
          const page = await discoveryApi.searchNearby({
            latitude: locationSession.coords.latitude,
            longitude: locationSession.coords.longitude,
            radiusKm: filters.radiusKm,
            q: debouncedQuery.trim() || undefined,
            page: pageParam,
            limit: 20,
          });
          if (page.serverTime) {
            serverClock.syncWithServer(page.serverTime, { expectedGeneration });
          }
          return page;
        } catch (err: unknown) {
          const is503 =
            (err as any)?.isServiceUnavailable === true ||
            (err as any)?.statusCode === 503;
          if (is503) {
            setProximityUnavailable(true);
            setFilters((prev) => ({ ...prev, mode: 'ALL' }));
            const fallbackPage = await discoveryApi.searchAll({
              q: debouncedQuery.trim() || undefined,
              page: pageParam,
              limit: 20,
            });
            if (fallbackPage.serverTime) {
              serverClock.syncWithServer(fallbackPage.serverTime, {
                expectedGeneration,
              });
            }
            return fallbackPage;
          }
          throw err;
        }
      }

      const page = await discoveryApi.searchAll({
        q: debouncedQuery.trim() || undefined,
        page: pageParam,
        limit: 20,
      });
      if (page.serverTime) {
        serverClock.syncWithServer(page.serverTime, { expectedGeneration });
      }
      return page;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const isServiceUnavailable = useMemo(() => {
    return (
      proximityUnavailable ||
      (error as any)?.isServiceUnavailable === true ||
      (error as any)?.statusCode === 503
    );
  }, [proximityUnavailable, error]);

  const effectiveMode: DiscoveryMode =
    isNearbyEligible && !isServiceUnavailable ? 'NEARBY' : 'ALL';

  // Concatenação de itens deduplicados por ID
  const items = useMemo<PublicShop[]>(() => {
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const list: PublicShop[] = [];

    for (const page of data.pages) {
      for (const shop of page.items) {
        if (!seen.has(shop.id)) {
          seen.add(shop.id);
          list.push(
            effectiveMode === 'ALL'
              ? { ...shop, distanceMeters: null }
              : shop,
          );
        }
      }
    }
    return list;
  }, [data?.pages, effectiveMode]);

  return {
    filters,
    effectiveMode,
    searchQuery: filters.searchQuery,
    setSearchQuery,
    setMode,
    setRadiusKm,
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    fetchNextPage,
    error: error as Error | null,
    isServiceUnavailable,
    refetch,
    locationSession,
    requestLocation,
  };
}
