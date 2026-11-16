import { useState, useEffect, useMemo, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { serverClock } from '../../bookings/lib/server-clock';
import { discoveryApi } from '../api/discovery.api';
import { locationStore } from './location-provider';
export function useDiscovery(initialParams) {
    var _a, _b;
    const [filters, setFilters] = useState(() => {
        var _a, _b, _c;
        const currentLoc = locationStore.getSession();
        const defaultMode = (_a = initialParams === null || initialParams === void 0 ? void 0 : initialParams.initialMode) !== null && _a !== void 0 ? _a : (currentLoc.state === 'granted' && currentLoc.coords !== null ? 'NEARBY' : 'ALL');
        return {
            mode: defaultMode,
            radiusKm: (_b = initialParams === null || initialParams === void 0 ? void 0 : initialParams.initialRadius) !== null && _b !== void 0 ? _b : 10,
            searchQuery: (_c = initialParams === null || initialParams === void 0 ? void 0 : initialParams.initialQuery) !== null && _c !== void 0 ? _c : '',
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
    const [locationSession, setLocationSession] = useState(() => locationStore.getSession());
    useEffect(() => {
        return locationStore.subscribe((session) => {
            setLocationSession(session);
            if (session.state === 'denied' ||
                session.state === 'unavailable' ||
                session.state === 'timeout' ||
                session.state === 'stale' ||
                session.state === 'idle') {
                setFilters((prev) => (prev.mode === 'NEARBY' ? { ...prev, mode: 'ALL' } : prev));
            }
        });
    }, []);
    const requestLocation = useCallback(async () => {
        const session = await locationStore.requestCurrentPosition();
        if (session.state === 'granted' && session.coords !== null) {
            setFilters((prev) => ({
                ...prev,
                mode: (initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly) ? prev.mode : 'NEARBY',
                radiusKm: prev.radiusKm || 10,
            }));
        }
        else {
            setFilters((prev) => (prev.mode === 'NEARBY' ? { ...prev, mode: 'ALL' } : prev));
        }
    }, [initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly]);
    const setSearchQuery = useCallback((query) => {
        setFilters((prev) => ({ ...prev, searchQuery: query }));
    }, []);
    const [proximityUnavailable, setProximityUnavailable] = useState(false);
    const setMode = useCallback((mode) => {
        if (mode === 'NEARBY') {
            setProximityUnavailable(false);
        }
        setFilters((prev) => ({ ...prev, mode }));
    }, []);
    const setRadiusKm = useCallback((radiusKm) => {
        setFilters((prev) => ({ ...prev, radiusKm }));
    }, []);
    const isNearbyEligible = ((initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly) || filters.mode === 'NEARBY') &&
        !proximityUnavailable &&
        locationSession.state === 'granted' &&
        locationSession.coords !== null;
    // Chave de query estritamente opaca e estável (coordenadas discretizadas em ~1km para permitir cache compartilhado)
    const queryKey = useMemo(() => {
        var _a;
        if (initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly) {
            return ['discovery', 'user-proximity', (_a = initialParams.actorId) !== null && _a !== void 0 ? _a : 'anon', locationSession.generationId, filters.mode === 'ALL' ? null : filters.radiusKm, debouncedQuery.trim()];
        }
        if (isNearbyEligible && locationSession.coords) {
            const latBucket = Math.round(locationSession.coords.latitude * 100) / 100;
            const lngBucket = Math.round(locationSession.coords.longitude * 100) / 100;
            return [
                'discovery',
                'nearby',
                latBucket,
                lngBucket,
                filters.radiusKm,
                debouncedQuery.trim(),
            ];
        }
        return ['discovery', 'all', debouncedQuery.trim()];
    }, [
        isNearbyEligible,
        initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly,
        initialParams === null || initialParams === void 0 ? void 0 : initialParams.actorId,
        locationSession.generationId,
        filters.mode,
        filters.radiusKm,
        debouncedQuery,
        (_a = locationSession.coords) === null || _a === void 0 ? void 0 : _a.latitude,
        (_b = locationSession.coords) === null || _b === void 0 ? void 0 : _b.longitude,
    ]);
    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch, } = useInfiniteQuery({
        queryKey,
        enabled: !(initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly) || isNearbyEligible || debouncedQuery.trim().length > 0,
        queryFn: async ({ pageParam = 1, signal }) => {
            const expectedGeneration = serverClock.getGeneration();
            if (isNearbyEligible && locationSession.coords) {
                try {
                    const page = await discoveryApi.searchNearby({
                        latitude: locationSession.coords.latitude,
                        longitude: locationSession.coords.longitude,
                        radiusKm: (initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly) && filters.mode === 'ALL' ? null : filters.radiusKm,
                        q: debouncedQuery.trim() || undefined,
                        page: pageParam,
                        limit: 20,
                    }, signal);
                    if (page.serverTime) {
                        serverClock.syncWithServer(page.serverTime, { expectedGeneration });
                    }
                    return page;
                }
                catch (err) {
                    const is503 = (err === null || err === void 0 ? void 0 : err.isServiceUnavailable) === true ||
                        (err === null || err === void 0 ? void 0 : err.statusCode) === 503;
                    if (is503 && !(initialParams === null || initialParams === void 0 ? void 0 : initialParams.proximityOnly)) {
                        setProximityUnavailable(true);
                        setFilters((prev) => ({ ...prev, mode: 'ALL' }));
                        const fallbackPage = await discoveryApi.searchAll({
                            q: debouncedQuery.trim() || undefined,
                            page: pageParam,
                            limit: 20,
                        }, signal);
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
            }, signal);
            if (page.serverTime) {
                serverClock.syncWithServer(page.serverTime, { expectedGeneration });
            }
            return page;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.page + 1 : undefined,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
    });
    const isServiceUnavailable = useMemo(() => {
        return (proximityUnavailable ||
            (error === null || error === void 0 ? void 0 : error.isServiceUnavailable) === true ||
            (error === null || error === void 0 ? void 0 : error.statusCode) === 503);
    }, [proximityUnavailable, error]);
    const effectiveMode = isNearbyEligible && !isServiceUnavailable ? 'NEARBY' : 'ALL';
    // Concatenação de itens deduplicados por ID
    const items = useMemo(() => {
        if (!(data === null || data === void 0 ? void 0 : data.pages))
            return [];
        const seen = new Set();
        const list = [];
        for (const page of data.pages) {
            for (const shop of page.items) {
                if (!seen.has(shop.id)) {
                    seen.add(shop.id);
                    list.push(effectiveMode === 'ALL'
                        ? { ...shop, distanceMeters: null }
                        : shop);
                }
            }
        }
        return list;
    }, [data === null || data === void 0 ? void 0 : data.pages, effectiveMode]);
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
        error: error,
        isServiceUnavailable,
        refetch,
        locationSession,
        requestLocation,
    };
}
