import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBookingById, } from '../api/bookings.api';
import { bookingQueryKeys, invalidateBookingQueries } from './booking-query-keys';
import { bookingOperationEngine } from './booking-operation-engine';
import { useSession } from '../../auth';
export function useBookingDetail({ bookingId, scope = 'PERSONAL', enabled = true, }) {
    const queryClient = useQueryClient();
    const { identity } = useSession();
    const [isMutating, setIsMutating] = useState(false);
    const [mutationError, setMutationError] = useState(null);
    const queryKey = bookingQueryKeys.detail(bookingId, scope, identity === null || identity === void 0 ? void 0 : identity.id);
    const { data: booking, isLoading, isFetching, error, refetch, } = useQuery({
        queryKey,
        queryFn: () => getBookingById(bookingId, scope),
        enabled: Boolean(bookingId) && enabled,
        staleTime: 1000 * 30, // 30s
    });
    const handleInvalidation = useCallback(async (targetBooking, newBarbermanId, dates) => {
        await invalidateBookingQueries(queryClient, {
            actorId: identity === null || identity === void 0 ? void 0 : identity.id,
            shopId: targetBooking.barbershopId,
            bookingId: targetBooking.id,
            oldProfessionalId: targetBooking.barbermanId,
            newProfessionalId: newBarbermanId !== null && newBarbermanId !== void 0 ? newBarbermanId : targetBooking.barbermanId,
            dates,
        });
    }, [queryClient, identity === null || identity === void 0 ? void 0 : identity.id]);
    const cancel = useCallback(async (request, idempotencyKey) => {
        var _a, _b, _c, _d, _e;
        if (!booking)
            throw new Error('Reserva não carregada.');
        setIsMutating(true);
        setMutationError(null);
        try {
            const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
            if (!actorId || !booking.version)
                throw new Error('Atualize a sessão e a reserva.');
            const expectedVersion = (_b = (_a = request === null || request === void 0 ? void 0 : request.expectedVersion) !== null && _a !== void 0 ? _a : booking.version) !== null && _b !== void 0 ? _b : 1;
            const prepared = await bookingOperationEngine.prepare({
                action: 'CANCEL',
                actorId,
                scope,
                bookingId: booking.id,
                expectedVersion,
                reason: request === null || request === void 0 ? void 0 : request.reason,
            });
            if (idempotencyKey) {
                if (prepared.requestId !== idempotencyKey)
                    throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
            }
            const result = await bookingOperationEngine.submit(prepared);
            const updatedBooking = (_e = (_d = (_c = result.resource) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.booking) !== null && _e !== void 0 ? _e : booking;
            await handleInvalidation(updatedBooking);
            return updatedBooking;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Falha ao cancelar reserva.';
            setMutationError(message);
            throw err;
        }
        finally {
            setIsMutating(false);
        }
    }, [booking, scope, handleInvalidation, identity === null || identity === void 0 ? void 0 : identity.id]);
    const reschedule = useCallback(async (request, idempotencyKey) => {
        var _a, _b, _c, _d, _e;
        if (!booking)
            throw new Error('Reserva não carregada.');
        setIsMutating(true);
        setMutationError(null);
        try {
            const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
            if (!actorId || !booking.version)
                throw new Error('Atualize a sessão e a reserva.');
            const expectedVersion = (_b = (_a = request.expectedVersion) !== null && _a !== void 0 ? _a : booking.version) !== null && _b !== void 0 ? _b : 1;
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
                if (prepared.requestId !== idempotencyKey)
                    throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
            }
            const result = await bookingOperationEngine.submit(prepared);
            const updatedBooking = (_e = (_d = (_c = result.resource) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.booking) !== null && _e !== void 0 ? _e : booking;
            await handleInvalidation(updatedBooking, request.barbermanId, [
                String(booking.date),
                request.date,
            ]);
            return updatedBooking;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Falha ao remarcar reserva.';
            setMutationError(message);
            throw err;
        }
        finally {
            setIsMutating(false);
        }
    }, [booking, scope, handleInvalidation, identity === null || identity === void 0 ? void 0 : identity.id]);
    const complete = useCallback(async (request, idempotencyKey) => {
        var _a, _b, _c, _d, _e;
        if (!booking)
            throw new Error('Reserva não carregada.');
        setIsMutating(true);
        setMutationError(null);
        try {
            const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
            if (!actorId || !booking.version)
                throw new Error('Atualize a sessão e a reserva.');
            const expectedVersion = (_b = (_a = request === null || request === void 0 ? void 0 : request.expectedVersion) !== null && _a !== void 0 ? _a : booking.version) !== null && _b !== void 0 ? _b : 1;
            const prepared = await bookingOperationEngine.prepare({
                action: 'COMPLETE',
                actorId,
                scope,
                bookingId: booking.id,
                expectedVersion,
                reason: request === null || request === void 0 ? void 0 : request.reason,
            });
            if (idempotencyKey) {
                if (prepared.requestId !== idempotencyKey)
                    throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
            }
            const result = await bookingOperationEngine.submit(prepared);
            const updatedBooking = (_e = (_d = (_c = result.resource) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.booking) !== null && _e !== void 0 ? _e : booking;
            await handleInvalidation(updatedBooking);
            return updatedBooking;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Falha ao concluir reserva.';
            setMutationError(message);
            throw err;
        }
        finally {
            setIsMutating(false);
        }
    }, [booking, scope, handleInvalidation, identity === null || identity === void 0 ? void 0 : identity.id]);
    const noShow = useCallback(async (request, idempotencyKey) => {
        var _a, _b, _c, _d, _e;
        if (!booking)
            throw new Error('Reserva não carregada.');
        setIsMutating(true);
        setMutationError(null);
        try {
            const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
            if (!actorId || !booking.version)
                throw new Error('Atualize a sessão e a reserva.');
            const expectedVersion = (_b = (_a = request === null || request === void 0 ? void 0 : request.expectedVersion) !== null && _a !== void 0 ? _a : booking.version) !== null && _b !== void 0 ? _b : 1;
            const prepared = await bookingOperationEngine.prepare({
                action: 'NO_SHOW',
                actorId,
                scope,
                bookingId: booking.id,
                expectedVersion,
                reason: request === null || request === void 0 ? void 0 : request.reason,
            });
            if (idempotencyKey) {
                if (prepared.requestId !== idempotencyKey)
                    throw new Error('Reutilize a tentativa persistida em vez de trocar sua chave.');
            }
            const result = await bookingOperationEngine.submit(prepared);
            const updatedBooking = (_e = (_d = (_c = result.resource) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.booking) !== null && _e !== void 0 ? _e : booking;
            await handleInvalidation(updatedBooking);
            return updatedBooking;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Falha ao registrar não comparecimento.';
            setMutationError(message);
            throw err;
        }
        finally {
            setIsMutating(false);
        }
    }, [booking, scope, handleInvalidation, identity === null || identity === void 0 ? void 0 : identity.id]);
    return {
        booking: booking !== null && booking !== void 0 ? booking : null,
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
