import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  transitionBookingStatus,
} from '../api/bookings.api';
import type {
  BookingDto,
  CancelBookingRequestDto,
  RescheduleBookingRequestDto,
  TransitionBookingStatusRequestDto,
} from '../api/bookings.dto';
import { bookingQueryKeys, invalidateBookingQueries } from './booking-query-keys';
import { useSession } from '@/features/auth';

export interface UseBookingDetailOptions {
  bookingId: string;
  scope?: 'PERSONAL' | 'UNIT';
  enabled?: boolean;
}

export function useBookingDetail({
  bookingId,
  scope = 'PERSONAL',
  enabled = true,
}: UseBookingDetailOptions) {
  const queryClient = useQueryClient();
  const { identity } = useSession();
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const queryKey = bookingQueryKeys.detail(bookingId, scope);

  const {
    data: booking,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<BookingDto>({
    queryKey,
    queryFn: () => getBookingById(bookingId),
    enabled: Boolean(bookingId) && enabled,
    staleTime: 1000 * 30, // 30s
  });

  const handleInvalidation = useCallback(
    async (targetBooking: BookingDto, newBarbermanId?: string, dates?: string[]) => {
      await invalidateBookingQueries(queryClient, {
        actorId: identity?.id,
        shopId: targetBooking.barbershopId,
        bookingId: targetBooking.id,
        oldProfessionalId: targetBooking.barbermanId,
        newProfessionalId: newBarbermanId ?? targetBooking.barbermanId,
        dates,
      });
    },
    [queryClient, identity?.id]
  );

  const cancel = useCallback(
    async (request?: CancelBookingRequestDto, idempotencyKey?: string) => {
      if (!booking) throw new Error('Reserva não carregada.');
      setIsMutating(true);
      setMutationError(null);
      try {
        const payload: CancelBookingRequestDto = {
          expectedVersion: request?.expectedVersion ?? booking.version ?? undefined,
          reason: request?.reason,
          scope,
        };
        const result = await cancelBooking(booking.id, payload, idempotencyKey);
        await handleInvalidation(result.booking);
        return result.booking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao cancelar reserva.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, scope, handleInvalidation]
  );

  const reschedule = useCallback(
    async (request: RescheduleBookingRequestDto, idempotencyKey?: string) => {
      if (!booking) throw new Error('Reserva não carregada.');
      setIsMutating(true);
      setMutationError(null);
      try {
        const payload: RescheduleBookingRequestDto = {
          ...request,
          expectedVersion: request.expectedVersion ?? booking.version ?? undefined,
          scope,
        };
        const result = await rescheduleBooking(booking.id, payload, idempotencyKey);
        await handleInvalidation(result.booking, request.barbermanId, [
          String(booking.date),
          request.date,
        ]);
        return result.booking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao remarcar reserva.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, scope, handleInvalidation]
  );

  const complete = useCallback(
    async (request?: Partial<TransitionBookingStatusRequestDto>, idempotencyKey?: string) => {
      if (!booking) throw new Error('Reserva não carregada.');
      setIsMutating(true);
      setMutationError(null);
      try {
        const payload: TransitionBookingStatusRequestDto = {
          status: 'COMPLETED',
          expectedVersion: request?.expectedVersion ?? booking.version ?? undefined,
          reason: request?.reason,
        };
        const result = await transitionBookingStatus(booking.id, payload, idempotencyKey);
        await handleInvalidation(result.booking);
        return result.booking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao concluir reserva.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, handleInvalidation]
  );

  const noShow = useCallback(
    async (request?: Partial<TransitionBookingStatusRequestDto>, idempotencyKey?: string) => {
      if (!booking) throw new Error('Reserva não carregada.');
      setIsMutating(true);
      setMutationError(null);
      try {
        const payload: TransitionBookingStatusRequestDto = {
          status: 'NO_SHOW',
          expectedVersion: request?.expectedVersion ?? booking.version ?? undefined,
          reason: request?.reason,
        };
        const result = await transitionBookingStatus(booking.id, payload, idempotencyKey);
        await handleInvalidation(result.booking);
        return result.booking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao registrar não comparecimento.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, handleInvalidation]
  );

  return {
    booking: booking ?? null,
    isLoading,
    isFetching,
    error,
    refetch,
    isMutating,
    mutationError,
    cancel,
    reschedule,
    complete,
    noShow,
  };
}
