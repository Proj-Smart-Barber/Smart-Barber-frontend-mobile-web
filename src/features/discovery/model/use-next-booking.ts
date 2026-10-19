import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { discoveryApi } from '../api/discovery.api';
import type { NextBookingItem } from '../api/discovery.contract';

export const NEXT_BOOKING_QUERY_KEY = ['bookings', 'me', 'upcoming'] as const;

export interface UseNextBookingResult {
  booking: NextBookingItem | null;
  serverTime: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useNextBooking(): UseNextBookingResult {
  const { token } = useSession();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: NEXT_BOOKING_QUERY_KEY,
    queryFn: async () => {
      return discoveryApi.fetchUpcomingBooking(token);
    },
    enabled: !!token,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 2 * 60 * 1000,
    retry: 1,
  });

  return {
    booking: data?.booking ?? null,
    serverTime: data?.serverTime ?? null,
    isLoading: isLoading && !!token,
    isError,
    error: error as Error | null,
    refetch,
  };
}

export function useInvalidateNextBooking() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: NEXT_BOOKING_QUERY_KEY });
  };
}
