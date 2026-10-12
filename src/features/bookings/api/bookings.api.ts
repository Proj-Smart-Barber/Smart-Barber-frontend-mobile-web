import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BOOKINGS_SYNC_CONFIG } from '../model/bookings-state';
import type { Booking, BookingDetails, IBookingsRepository, UpdateBookingInput } from './bookings.contract';
import { bookingsHttpAdapter } from './bookings.http';

export const bookingsRepository: IBookingsRepository = bookingsHttpAdapter;

export const BOOKINGS_QUERY_KEYS = {
  all: ['bookings'] as const,
  day: (date: string) => ['bookings', 'day', date] as const,
};

/**
 * Consulta dos atendimentos confirmados do dia (barbeiro resolvido pelo JWT).
 */
export function useDayBookingsQuery(date: string) {
  return useQuery<BookingDetails[]>({
    queryKey: BOOKINGS_QUERY_KEYS.day(date),
    queryFn: () => bookingsRepository.getDayBookings({ date }),
    staleTime: BOOKINGS_SYNC_CONFIG.staleTimeMs,
    refetchInterval: BOOKINGS_SYNC_CONFIG.pollingIntervalMs,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/**
 * Mutação de remarcação:
 * PATCH /api/bookings/:bookingId/update
 */
export function useUpdateBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateBookingInput) => bookingsRepository.updateBooking(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Mutação de cancelamento:
 * DELETE /api/bookings/:bookingId/cancel
 */
export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingsRepository.cancelBooking(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ['agenda'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
