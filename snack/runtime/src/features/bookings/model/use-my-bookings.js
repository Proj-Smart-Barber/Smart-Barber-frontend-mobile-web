import { useMemo, useRef, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMyBookings } from '../api/bookings.api';
import { bookingQueryKeys } from './booking-query-keys';
import { serverClock } from '../lib/server-clock';
import { isUpcomingBooking, parseBookingStartTimeMs } from '../lib/booking-time';
export const MY_BOOKINGS_QUERY_KEY = ['bookings', 'me'];
export function useMyBookings(optionsOrEnabled = true) {
    var _a, _b, _c;
    const options = typeof optionsOrEnabled === 'boolean'
        ? { enabled: optionsOrEnabled }
        : optionsOrEnabled;
    const enabled = (_a = options.enabled) !== null && _a !== void 0 ? _a : true;
    const actorId = (_b = options.actorId) !== null && _b !== void 0 ? _b : null;
    const queryKey = bookingQueryKeys.myBookings(actorId);
    const { data, isLoading, isFetching, isFetchingNextPage, error, fetchNextPage, hasNextPage, refetch, isRefetching, } = useInfiniteQuery({
        queryKey,
        queryFn: async ({ pageParam = 1, signal }) => {
            return fetchMyBookings({ page: pageParam }, { signal });
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage || lastPage.length < 20) {
                return undefined;
            }
            return allPages.length + 1;
        },
        enabled,
        staleTime: 1000 * 30, // 30s
    });
    const allItems = useMemo(() => {
        if (!(data === null || data === void 0 ? void 0 : data.pages))
            return [];
        const seen = new Set();
        const list = [];
        for (const page of data.pages) {
            for (const item of page) {
                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    list.push(item);
                }
            }
        }
        return list;
    }, [data === null || data === void 0 ? void 0 : data.pages]);
    const nowMs = (_c = serverClock.now()) !== null && _c !== void 0 ? _c : Date.now();
    const { upcoming, past, nextBooking, statusCounts } = useMemo(() => {
        const upcomingList = [];
        const pastList = [];
        const counts = {};
        for (const item of allItems) {
            const statusKey = item.status || 'UNKNOWN';
            counts[statusKey] = (counts[statusKey] || 0) + 1;
            if (isUpcomingBooking(item, nowMs)) {
                upcomingList.push(item);
            }
            else {
                pastList.push(item);
            }
        }
        upcomingList.sort((a, b) => {
            var _a, _b;
            const aTime = (_a = parseBookingStartTimeMs(a)) !== null && _a !== void 0 ? _a : Infinity;
            const bTime = (_b = parseBookingStartTimeMs(b)) !== null && _b !== void 0 ? _b : Infinity;
            return aTime - bTime;
        });
        pastList.sort((a, b) => {
            var _a, _b;
            const aTime = (_a = parseBookingStartTimeMs(a)) !== null && _a !== void 0 ? _a : 0;
            const bTime = (_b = parseBookingStartTimeMs(b)) !== null && _b !== void 0 ? _b : 0;
            return bTime - aTime;
        });
        const next = upcomingList.length > 0 ? upcomingList[0] : null;
        return {
            upcoming: upcomingList,
            past: pastList,
            nextBooking: next,
            statusCounts: counts,
        };
    }, [allItems, nowMs]);
    const isFetchingNextPageRef = useRef(false);
    const loadNextPage = useCallback(async () => {
        if (!hasNextPage || isFetchingNextPage || isFetchingNextPageRef.current) {
            return;
        }
        isFetchingNextPageRef.current = true;
        try {
            await fetchNextPage();
        }
        finally {
            isFetchingNextPageRef.current = false;
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
    return {
        bookings: allItems,
        upcoming,
        past,
        nextBooking,
        statusCounts,
        isLoading,
        isFetching,
        isFetchingNextPage,
        error,
        hasMore: Boolean(hasNextPage),
        fetchNextPage,
        loadNextPage,
        refetch,
        isRefetching,
        data: allItems,
    };
}
