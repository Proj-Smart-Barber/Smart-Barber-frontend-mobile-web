import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
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
  const [filters, setFilters] = useState<DiscoveryFilters>({
    mode: initialParams?.initialMode ?? 'ALL',
    radiusKm: initialParams?.initialRadius ?? 10,
    searchQuery: initialParams?.initialQuery ?? '',
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
    });
  }, []);

  const requestLocation = useCallback(async () => {
    await locationStore.requestCurrentPosition();
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setMode = useCallback((mode: DiscoveryMode) => {
    setFilters((prev) => ({ ...prev, mode }));
  }, []);

  const setRadiusKm = useCallback((radiusKm: DiscoveryRadius) => {
    setFilters((prev) => ({ ...prev, radiusKm }));
  }, []);

  // Chave de query estritamente opaca (NUNCA incluir coordenadas em query keys!)
  const queryKey = useMemo(() => {
    if (filters.mode === 'NEARBY' && locationSession.state === 'granted') {
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
    filters.mode,
    filters.radiusKm,
    debouncedQuery,
    locationSession.state,
    locationSession.generationId,
  ]);

  const isNearbyEligible =
    filters.mode === 'NEARBY' &&
    locationSession.state === 'granted' &&
    locationSession.coords !== null;

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
      if (isNearbyEligible && locationSession.coords) {
        return discoveryApi.searchNearby({
          latitude: locationSession.coords.latitude,
          longitude: locationSession.coords.longitude,
          radiusKm: filters.radiusKm,
          q: debouncedQuery.trim() || undefined,
          page: pageParam,
          limit: 20,
        });
      }

      return discoveryApi.searchAll({
        q: debouncedQuery.trim() || undefined,
        page: pageParam,
        limit: 20,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Concatenação de itens deduplicados por ID
  const items = useMemo<PublicShop[]>(() => {
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const list: PublicShop[] = [];

    for (const page of data.pages) {
      for (const shop of page.items) {
        if (!seen.has(shop.id)) {
          seen.add(shop.id);
          list.push(shop);
        }
      }
    }
    return list;
  }, [data?.pages]);

  const isServiceUnavailable = useMemo(() => {
    return (
      (error as any)?.isServiceUnavailable === true ||
      (error as any)?.statusCode === 503
    );
  }, [error]);

  return {
    filters,
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
