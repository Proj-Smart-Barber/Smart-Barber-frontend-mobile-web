import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { serverClock } from '@/features/bookings';
import { discoveryApi } from '../api/discovery.api';
import type { NextBookingItem } from '../api/discovery.contract';

export const NEXT_BOOKING_QUERY_KEY = ['bookings', 'me', 'upcoming'] as const;

export function buildNextBookingQueryKey(actorId?: string | null) {
  return ['bookings', 'me', 'upcoming', actorId ?? 'anon'] as const;
}

export interface UseNextBookingResult {
  booking: NextBookingItem | null;
  serverTime: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useNextBooking(): UseNextBookingResult {
  const { token, identity, status } = useSession();
  const actorId = identity?.id ?? null;
  const isAuthenticated = status === 'authenticated' && Boolean(actorId) && Boolean(token);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: buildNextBookingQueryKey(actorId),
    queryFn: async () => {
      const expectedGeneration = serverClock.getGeneration();
      const result = await discoveryApi.fetchUpcomingBooking(token);
      if (result.serverTime) {
        serverClock.syncWithServer(result.serverTime, { expectedGeneration });
      }
      return result;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000,
    retry: 1,
  });

  return {
    booking: data?.booking ?? null,
    serverTime: data?.serverTime ?? null,
    isLoading: isLoading && isAuthenticated,
    isError,
    error: error as Error | null,
    refetch,
  };
}

export function useInvalidateNextBooking() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: NEXT_BOOKING_QUERY_KEY });
  };
}
