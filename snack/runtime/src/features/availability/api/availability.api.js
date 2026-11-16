import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ENV } from '../../../shared/config/env';
import { serverClock } from '../../bookings/lib/server-clock';
import { invalidateBookingQueries } from '../../bookings/model/booking-query-keys';
import { AvailabilityHttpAdapter } from './availability.http';
import { AvailabilityMockAdapter } from './availability.mock';
export const availabilityRepository = ENV.AVAILABILITY_SOURCE === 'http'
    ? new AvailabilityHttpAdapter()
    : new AvailabilityMockAdapter();
export const AVAILABILITY_QUERY_KEYS = {
    all: (barbershopId) => ['availability', barbershopId],
    barbershop: (barbershopId) => ['availability', barbershopId, 'barbershop'],
    schedule: (barbershopId, barbermanId) => ['availability', barbershopId, 'schedule', barbermanId !== null && barbermanId !== void 0 ? barbermanId : 'general'],
    scope: (barbershopId, barbermanId) => ['availability', barbershopId, 'scope', barbermanId !== null && barbermanId !== void 0 ? barbermanId : 'general'],
    exceptions: (barbershopId, barbermanId) => ['availability', barbershopId, 'exceptions', barbermanId !== null && barbermanId !== void 0 ? barbermanId : 'general'],
    slotsBase: (barbershopId) => ['availability', barbershopId, 'slots'],
    slots: (barbershopId, serviceIds, date, barbermanId) => [
        'availability',
        barbershopId,
        'slots',
        [...serviceIds].sort().join(','),
        date,
        barbermanId !== null && barbermanId !== void 0 ? barbermanId : 'general',
    ],
};
/** Jornada e exceções alteram slots ofertados: invalida disponibilidade da reserva, agenda e painel da unidade. */
export function invalidateScheduleConsumers(queryClient, barbershopId) {
    return Promise.all([
        queryClient.invalidateQueries({ queryKey: AVAILABILITY_QUERY_KEYS.all(barbershopId) }),
        invalidateBookingQueries(queryClient, { shopId: barbershopId }),
    ]);
}
/** Lê o documento autoritativo do escopo e alinha o relógio de servidor usado nas chaves de idempotência. */
export async function fetchScheduleScope(barbershopId, barbermanId) {
    const expectedGeneration = serverClock.getGeneration();
    const document = await availabilityRepository.getScheduleScope(barbershopId, barbermanId);
    if (document.serverTime) {
        try {
            serverClock.syncWithServer(document.serverTime, { expectedGeneration });
        }
        catch { /* resposta continua válida */ }
    }
    return document;
}
export function useScheduleScopeQuery(barbershopId, barbermanId) {
    return useQuery({
        queryKey: AVAILABILITY_QUERY_KEYS.scope(barbershopId, barbermanId),
        queryFn: () => fetchScheduleScope(barbershopId, barbermanId),
        enabled: Boolean(barbershopId),
        staleTime: 0,
        retry: false,
    });
}
export function useBarbershopQuery(barbershopId) {
    return useQuery({
        queryKey: AVAILABILITY_QUERY_KEYS.barbershop(barbershopId),
        queryFn: () => availabilityRepository.getBarbershop(barbershopId),
        enabled: Boolean(barbershopId),
        staleTime: 5 * 60000,
        retry: false,
    });
}
export function useWeeklyScheduleQuery(barbershopId, barbermanId) {
    return useQuery({
        queryKey: AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId),
        queryFn: () => availabilityRepository.getWeeklySchedule(barbershopId, barbermanId),
        enabled: Boolean(barbershopId),
        staleTime: 30000,
        retry: false,
    });
}
export function useSaveWeeklyScheduleMutation(barbershopId, barbermanId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (entries) => availabilityRepository.saveWeeklySchedule(barbershopId, entries, barbermanId),
        onSuccess: (savedEntries) => {
            queryClient.setQueryData(AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId), savedEntries);
            // Em HTTP, o GET agora é real; a invalidação confirma o estado persistido.
            if (ENV.AVAILABILITY_SOURCE === 'http') {
                void queryClient.invalidateQueries({
                    queryKey: AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId),
                });
            }
            void invalidateScheduleConsumers(queryClient, barbershopId);
        },
    });
}
export function useExceptionsQuery(barbershopId, barbermanId) {
    return useQuery({
        queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
        queryFn: () => availabilityRepository.listExceptions(barbershopId, barbermanId),
        enabled: Boolean(barbershopId),
        staleTime: 30000,
        retry: false,
    });
}
export function useCreateExceptionMutation(barbershopId, barbermanId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (exception) => availabilityRepository.createException(barbershopId, exception),
        onSuccess: (created) => {
            queryClient.setQueryData(AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId), (current = []) => {
                if (current.some((item) => item.id === created.id))
                    return current;
                return [...current, created];
            });
            if (ENV.AVAILABILITY_SOURCE === 'http') {
                void queryClient.invalidateQueries({
                    queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
                });
            }
            void invalidateScheduleConsumers(queryClient, barbershopId);
        },
    });
}
export function useUpdateExceptionMutation(barbershopId, barbermanId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ exceptionId, exception, }) => availabilityRepository.updateException(barbershopId, exceptionId, exception),
        onSuccess: (updated, variables) => {
            queryClient.setQueryData(AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId), (current = []) => [
                ...current.filter((item) => item.id !== variables.exceptionId),
                updated,
            ]);
            if (ENV.AVAILABILITY_SOURCE === 'http') {
                void queryClient.invalidateQueries({
                    queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
                });
            }
            void invalidateScheduleConsumers(queryClient, barbershopId);
        },
    });
}
export function useRemoveExceptionMutation(barbershopId, barbermanId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (exceptionId) => availabilityRepository.removeException(barbershopId, exceptionId),
        onSuccess: (_data, exceptionId) => {
            queryClient.setQueryData(AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId), (current = []) => current.filter((item) => item.id !== exceptionId));
            if (ENV.AVAILABILITY_SOURCE === 'http') {
                void queryClient.invalidateQueries({
                    queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
                });
            }
            void invalidateScheduleConsumers(queryClient, barbershopId);
        },
    });
}
export function useAvailabilitySlotsQuery(barbershopId, params, enabled = true) {
    return useQuery({
        queryKey: AVAILABILITY_QUERY_KEYS.slots(barbershopId, params.serviceIds, params.date, params.barbermanId),
        queryFn: () => availabilityRepository.getCalculatedAvailability(barbershopId, params),
        enabled: enabled && Boolean(barbershopId) && params.serviceIds.length > 0,
        retry: false,
    });
}
