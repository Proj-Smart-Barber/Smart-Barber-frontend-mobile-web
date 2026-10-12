import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchMyBookings } from '../api/bookings.api';
import type { BookingDto } from '../api/bookings.dto';
import { bookingQueryKeys } from './booking-query-keys';
import { serverClock } from '../lib/server-clock';
import { isUpcomingBooking, parseBookingStartTimeMs } from '../lib/booking-time';

export const MY_BOOKINGS_QUERY_KEY = ['bookings', 'me'];

export interface UseMyBookingsOptions {
  actorId?: string | null;
  enabled?: boolean;
}

export function useMyBookings(optionsOrEnabled: boolean | UseMyBookingsOptions = true) {
  const options: UseMyBookingsOptions =
    typeof optionsOrEnabled === 'boolean'
      ? { enabled: optionsOrEnabled }
      : optionsOrEnabled;

  const enabled = options.enabled ?? true;
  const actorId = options.actorId ?? null;

  const queryKey = bookingQueryKeys.myBookings(actorId);

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery<BookingDto[]>({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      return fetchMyBookings({ page: pageParam as number });
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
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const list: BookingDto[] = [];
    for (const page of data.pages) {
      for (const item of page) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      }
    }
    return list;
  }, [data?.pages]);

  const nowMs = serverClock.now() ?? Date.now();

  const { upcoming, past, nextBooking, statusCounts } = useMemo(() => {
    const upcomingList: BookingDto[] = [];
    const pastList: BookingDto[] = [];
    const counts: Record<string, number> = {};

    for (const item of allItems) {
      const statusKey = item.status || 'UNKNOWN';
      counts[statusKey] = (counts[statusKey] || 0) + 1;

      if (isUpcomingBooking(item, nowMs)) {
        upcomingList.push(item);
      } else {
        pastList.push(item);
      }
    }

    upcomingList.sort((a, b) => {
      const aTime = parseBookingStartTimeMs(a) ?? Infinity;
      const bTime = parseBookingStartTimeMs(b) ?? Infinity;
      return aTime - bTime;
    });

    pastList.sort((a, b) => {
      const aTime = parseBookingStartTimeMs(a) ?? 0;
      const bTime = parseBookingStartTimeMs(b) ?? 0;
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
    loadNextPage: () => {
      if (hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    refetch,
    isRefetching,
    data: allItems,
  };
}
