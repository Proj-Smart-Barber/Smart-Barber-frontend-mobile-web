import { useQuery } from '@tanstack/react-query';
import { fetchMyBookings } from '../api/bookings.api';
import type { BookingDto } from '../api/bookings.dto';

export const MY_BOOKINGS_QUERY_KEY = ['bookings', 'me'];

export function useMyBookings(enabled: boolean = true) {
  return useQuery<BookingDto[]>({
    queryKey: MY_BOOKINGS_QUERY_KEY,
    queryFn: () => fetchMyBookings(),
    enabled,
    staleTime: 1000 * 30, // 30s
  });
}
