import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { exploreFeedApi } from '../api/explore-feed.api';
import { locationStore, type LocationSession } from './location-provider';
import type { DiscoveryMode, DiscoveryRadius } from './discovery.types';
import type { ExploreFeedItem } from '../api/explore-feed.contract';

export interface UseExploreFeedParams {
  initialMode?: DiscoveryMode;
  initialRadius?: DiscoveryRadius;
  initialQuery?: string;
}

export interface UseExploreFeedViewModel {
  items: ExploreFeedItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: Error | null;
  mode: DiscoveryMode;
  radiusKm: DiscoveryRadius;
  searchQuery: string;
  regionKey: string;
  setRegionKey: (region: string) => void;
  locationSession: LocationSession;
  fetchNextPage: () => void;
  refetch: () => void;
  setMode: (mode: DiscoveryMode) => void;
  setRadius: (radius: DiscoveryRadius) => void;
  setSearchQuery: (query: string) => void;
}

export function useExploreFeed(params?: UseExploreFeedParams): UseExploreFeedViewModel {
  const queryClient = useQueryClient();
  const [mode, setModeState] = useState<DiscoveryMode>(() => {
    const currentLoc = locationStore.getSession();
    return (
      params?.initialMode ??
      (currentLoc.state === 'granted' && currentLoc.coords !== null ? 'NEARBY' : 'ALL')
    );
  });

  const [regionKey, setRegionKey] = useState('');
  const [radiusKm, setRadiusState] = useState<DiscoveryRadius>(params?.initialRadius ?? 10);
  const [searchQuery, setSearchQuery] = useState(params?.initialQuery ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        setModeState((prev) => (prev === 'NEARBY' ? 'ALL' : prev));
      }
    });
  }, []);

  const latBucket = useMemo(() => {
    if (!locationSession.coords) return null;
    return locationSession.coords.latitude;
  }, [locationSession.coords]);

  const lngBucket = useMemo(() => {
    if (!locationSession.coords) return null;
    return locationSession.coords.longitude;
  }, [locationSession.coords]);

  const queryKey = useMemo(
    () => ['explore-feed', mode, radiusKm, debouncedQuery, regionKey, latBucket, lngBucket],
    [mode, radiusKm, debouncedQuery, regionKey, latBucket, lngBucket],
  );

  const isNearbyValid =
    mode === 'NEARBY' &&
    !regionKey &&
    locationSession.state === 'granted' &&
    locationSession.coords !== null;

  const effectiveMode = isNearbyValid ? 'NEARBY' : 'ALL';

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, error } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam, signal }) => {
        return exploreFeedApi.getFeed(
          {
            mode: effectiveMode,
            point:
              isNearbyValid && locationSession.coords
                ? {
                    latitude: locationSession.coords.latitude,
                    longitude: locationSession.coords.longitude,
                  }
                : undefined,
            radiusKm: isNearbyValid ? radiusKm : undefined,
            q: debouncedQuery || undefined,
            regionKey: regionKey.trim() || undefined,
            limit: 10,
            cursor: pageParam as string | undefined,
          },
          signal,
        );
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
    });

  const items = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const setMode = useCallback((newMode: DiscoveryMode) => {
    setModeState(newMode);
  }, []);

  const setRadius = useCallback((newRadius: DiscoveryRadius) => {
    setRadiusState(newRadius);
  }, []);

  return {
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    error: error as Error | null,
    mode: effectiveMode,
    radiusKm,
    searchQuery,
    regionKey,
    setRegionKey,
    locationSession,
    fetchNextPage,
    refetch: () => {
      void queryClient.resetQueries({ queryKey, exact: true });
    },
    setMode,
    setRadius,
    setSearchQuery,
  };
}
