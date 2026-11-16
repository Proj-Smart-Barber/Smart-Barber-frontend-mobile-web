import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { exploreFeedApi } from '../api/explore-feed.api';
import { locationStore } from './location-provider';
export function useExploreFeed(params) {
    var _a, _b;
    const queryClient = useQueryClient();
    const [mode, setModeState] = useState(() => {
        var _a;
        return (_a = params === null || params === void 0 ? void 0 : params.initialMode) !== null && _a !== void 0 ? _a : 'ALL';
    });
    const [regionKey, setRegionKey] = useState('');
    const [proximityUnavailable, setProximityUnavailable] = useState(false);
    const [radiusKm, setRadiusState] = useState((_a = params === null || params === void 0 ? void 0 : params.initialRadius) !== null && _a !== void 0 ? _a : 10);
    const [searchQuery, setSearchQuery] = useState((_b = params === null || params === void 0 ? void 0 : params.initialQuery) !== null && _b !== void 0 ? _b : '');
    const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);
    const [locationSession, setLocationSession] = useState(() => locationStore.getSession());
    useEffect(() => {
        return locationStore.subscribe((session) => {
            setLocationSession(session);
            if (session.state === 'denied' ||
                session.state === 'unavailable' ||
                session.state === 'timeout' ||
                session.state === 'stale' ||
                session.state === 'idle') {
                setModeState((prev) => (prev === 'NEARBY' ? 'ALL' : prev));
            }
        });
    }, []);
    const latBucket = useMemo(() => {
        if (!locationSession.coords)
            return null;
        return locationSession.coords.latitude;
    }, [locationSession.coords]);
    const lngBucket = useMemo(() => {
        if (!locationSession.coords)
            return null;
        return locationSession.coords.longitude;
    }, [locationSession.coords]);
    const isNearbyValid = mode === 'NEARBY' &&
        !proximityUnavailable &&
        !regionKey &&
        locationSession.state === 'granted' &&
        locationSession.coords !== null;
    const effectiveMode = isNearbyValid ? 'NEARBY' : 'ALL';
    const queryKey = useMemo(() => [
        'explore-feed',
        effectiveMode,
        radiusKm,
        debouncedQuery,
        regionKey,
        latBucket,
        lngBucket,
        proximityUnavailable,
    ], [
        effectiveMode,
        radiusKm,
        debouncedQuery,
        regionKey,
        latBucket,
        lngBucket,
        proximityUnavailable,
    ]);
    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, error } = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam, signal }) => {
            var _a;
            if (isNearbyValid && locationSession.coords) {
                try {
                    return await exploreFeedApi.getFeed({
                        mode: 'NEARBY',
                        point: {
                            latitude: locationSession.coords.latitude,
                            longitude: locationSession.coords.longitude,
                        },
                        radiusKm,
                        q: debouncedQuery || undefined,
                        regionKey: regionKey.trim() || undefined,
                        limit: 10,
                        cursor: pageParam,
                    }, signal);
                }
                catch (err) {
                    const is503 = (err === null || err === void 0 ? void 0 : err.isServiceUnavailable) === true ||
                        (err === null || err === void 0 ? void 0 : err.statusCode) === 503 ||
                        (err === null || err === void 0 ? void 0 : err.status) === 503 ||
                        ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.status) === 503;
                    if (is503) {
                        setProximityUnavailable(true);
                        return exploreFeedApi.getFeed({
                            mode: 'ALL',
                            q: debouncedQuery || undefined,
                            regionKey: regionKey.trim() || undefined,
                            limit: 10,
                            cursor: pageParam,
                        }, signal);
                    }
                    throw err;
                }
            }
            return exploreFeedApi.getFeed({
                mode: 'ALL',
                q: debouncedQuery || undefined,
                regionKey: regionKey.trim() || undefined,
                limit: 10,
                cursor: pageParam,
            }, signal);
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => { var _a; return (_a = lastPage.nextCursor) !== null && _a !== void 0 ? _a : undefined; },
        staleTime: 5 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
    });
    const items = useMemo(() => {
        if (!(data === null || data === void 0 ? void 0 : data.pages))
            return [];
        return data.pages.flatMap((page) => page.items);
    }, [data]);
    const setMode = useCallback((newMode) => {
        if (newMode === 'NEARBY') {
            setProximityUnavailable(false);
        }
        setModeState(newMode);
    }, []);
    const setRadius = useCallback((newRadius) => {
        setRadiusState(newRadius);
    }, []);
    return {
        items,
        isLoading,
        isFetchingNextPage,
        hasNextPage: Boolean(hasNextPage),
        error: error,
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
