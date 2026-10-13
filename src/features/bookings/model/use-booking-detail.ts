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
import { bookingOperationEngine } from './booking-operation-engine';
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

  const queryKey = bookingQueryKeys.detail(bookingId, scope, identity?.id);

  const {
    data: booking,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<BookingDto>({
    queryKey,
    queryFn: () => getBookingById(bookingId, scope),
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
        const actorId = identity?.id;
        if (!actorId || !booking.version) throw new Error('Atualize a sessão e a reserva.');
        const expectedVersion = request?.expectedVersion ?? booking.version ?? 1;
        const prepared = await bookingOperationEngine.prepare({
          action: 'CANCEL',
          actorId,
          scope,
          bookingId: booking.id,
          expectedVersion,
          reason: request?.reason,
        });
        if (idempotencyKey) {
          if (prepared.requestId !== idempotencyKey) throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
        }
        const result = await bookingOperationEngine.submit(prepared);
        const updatedBooking = result.resource?.data?.booking ?? booking;
        await handleInvalidation(updatedBooking);
        return updatedBooking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao cancelar reserva.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, scope, handleInvalidation, identity?.id]
  );

  const reschedule = useCallback(
    async (request: RescheduleBookingRequestDto, idempotencyKey?: string) => {
      if (!booking) throw new Error('Reserva não carregada.');
      setIsMutating(true);
      setMutationError(null);
      try {
        const actorId = identity?.id;
        if (!actorId || !booking.version) throw new Error('Atualize a sessão e a reserva.');
        const expectedVersion = request.expectedVersion ?? booking.version ?? 1;
        const prepared = await bookingOperationEngine.prepare({
          action: 'RESCHEDULE',
          actorId,
          scope,
          bookingId: booking.id,
          expectedVersion,
          date: request.date,
          startTime: request.startTime,
          barbermanId: request.barbermanId,
          serviceIds: request.serviceIds,
          expectedTotalPriceInCents: request.expectedTotalPriceInCents,
          expectedDurationInMinutes: request.expectedDurationInMinutes,
          reason: request.reason,
        });
        if (idempotencyKey) {
          if (prepared.requestId !== idempotencyKey) throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
        }
        const result = await bookingOperationEngine.submit(prepared);
        const updatedBooking = result.resource?.data?.booking ?? booking;
        await handleInvalidation(updatedBooking, request.barbermanId, [
          String(booking.date),
          request.date,
        ]);
        return updatedBooking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao remarcar reserva.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, scope, handleInvalidation, identity?.id]
  );

  const complete = useCallback(
    async (request?: Partial<TransitionBookingStatusRequestDto>, idempotencyKey?: string) => {
      if (!booking) throw new Error('Reserva não carregada.');
      setIsMutating(true);
      setMutationError(null);
      try {
        const actorId = identity?.id;
        if (!actorId || !booking.version) throw new Error('Atualize a sessão e a reserva.');
        const expectedVersion = request?.expectedVersion ?? booking.version ?? 1;
        const prepared = await bookingOperationEngine.prepare({
          action: 'COMPLETE',
          actorId,
          scope,
          bookingId: booking.id,
          expectedVersion,
          reason: request?.reason,
        });
        if (idempotencyKey) {
          if (prepared.requestId !== idempotencyKey) throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
        }
        const result = await bookingOperationEngine.submit(prepared);
        const updatedBooking = result.resource?.data?.booking ?? booking;
        await handleInvalidation(updatedBooking);
        return updatedBooking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao concluir reserva.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, scope, handleInvalidation, identity?.id]
  );

  const noShow = useCallback(
    async (request?: Partial<TransitionBookingStatusRequestDto>, idempotencyKey?: string) => {
      if (!booking) throw new Error('Reserva não carregada.');
      setIsMutating(true);
      setMutationError(null);
      try {
        const actorId = identity?.id;
        if (!actorId || !booking.version) throw new Error('Atualize a sessão e a reserva.');
        const expectedVersion = request?.expectedVersion ?? booking.version ?? 1;
        const prepared = await bookingOperationEngine.prepare({
          action: 'NO_SHOW',
          actorId,
          scope,
          bookingId: booking.id,
          expectedVersion,
          reason: request?.reason,
        });
        if (idempotencyKey) {
          if (prepared.requestId !== idempotencyKey) throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
        }
        const result = await bookingOperationEngine.submit(prepared);
        const updatedBooking = result.resource?.data?.booking ?? booking;
        await handleInvalidation(updatedBooking);
        return updatedBooking;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao registrar não comparecimento.';
        setMutationError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [booking, scope, handleInvalidation, identity?.id]
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
