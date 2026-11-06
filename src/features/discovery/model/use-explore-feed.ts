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
  isProximityUnavailable: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  setMode: (mode: DiscoveryMode) => void;
  setRadius: (radius: DiscoveryRadius) => void;
  setSearchQuery: (query: string) => void;
}

export function useExploreFeed(params?: UseExploreFeedParams): UseExploreFeedViewModel {
  const queryClient = useQueryClient();
  const [mode, setModeState] = useState<DiscoveryMode>(() => {
    return params?.initialMode ?? 'ALL';
  });

  const [regionKey, setRegionKey] = useState('');
  const [proximityUnavailable, setProximityUnavailable] = useState(false);
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

  const isNearbyValid =
    mode === 'NEARBY' &&
    !proximityUnavailable &&
    !regionKey &&
    locationSession.state === 'granted' &&
    locationSession.coords !== null;

  const effectiveMode = isNearbyValid ? 'NEARBY' : 'ALL';

  const queryKey = useMemo(
    () => [
      'explore-feed',
      effectiveMode,
      radiusKm,
      debouncedQuery,
      regionKey,
      latBucket,
      lngBucket,
      proximityUnavailable,
    ],
    [
      effectiveMode,
      radiusKm,
      debouncedQuery,
      regionKey,
      latBucket,
      lngBucket,
      proximityUnavailable,
    ],
  );

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, error } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam, signal }) => {
        if (isNearbyValid && locationSession.coords) {
          try {
            return await exploreFeedApi.getFeed(
              {
                mode: 'NEARBY',
                point: {
                  latitude: locationSession.coords.latitude,
                  longitude: locationSession.coords.longitude,
                },
                radiusKm,
                q: debouncedQuery || undefined,
                regionKey: regionKey.trim() || undefined,
                limit: 10,
                cursor: pageParam as string | undefined,
              },
              signal,
            );
          } catch (err: unknown) {
            const is503 =
              (err as any)?.isServiceUnavailable === true ||
              (err as any)?.statusCode === 503 ||
              (err as any)?.status === 503 ||
              (err as any)?.response?.status === 503;
            if (is503) {
              setProximityUnavailable(true);
              return exploreFeedApi.getFeed(
                {
                  mode: 'ALL',
                  q: debouncedQuery || undefined,
                  regionKey: regionKey.trim() || undefined,
                  limit: 10,
                  cursor: pageParam as string | undefined,
                },
                signal,
              );
            }
            throw err;
          }
        }

        return exploreFeedApi.getFeed(
          {
            mode: 'ALL',
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
    if (newMode === 'NEARBY') {
      setProximityUnavailable(false);
    }
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
    isProximityUnavailable: proximityUnavailable,
    fetchNextPage,
    refetch: () => {
      void queryClient.resetQueries({ queryKey, exact: true });
    },
    setMode,
    setRadius,
    setSearchQuery,
  };
}
