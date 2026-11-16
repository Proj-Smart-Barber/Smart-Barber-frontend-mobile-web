import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AGENDA_SYNC_CONFIG } from '../model/agenda-state';
import { AgendaMockAdapter } from './agenda.mock';
import { AgendaHttpAdapter } from './agenda.http';
import { ENV } from '../../../shared/config/env';
import { getBookingById } from '../../bookings/api/bookings.api';
import { bookingOperationEngine } from '../../bookings/model/booking-operation-engine';
// Port / Adapter singleton: usa AgendaHttpAdapter por padrão no ambiente HTTP
export const agendaRepository = ENV.AVAILABILITY_SOURCE === 'mock'
    ? new AgendaMockAdapter()
    : new AgendaHttpAdapter();
export const AGENDA_QUERY_KEYS = {
    all: ['agenda'],
    day: (scope, date) => { var _a; return ['agenda', 'day', (_a = scope.shopId) !== null && _a !== void 0 ? _a : 'no-shop', scope.role, scope.staffId, date]; },
};
/**
 * Consulta do dia da agenda.
 */
export function useAgendaDayQuery(scope, date) {
    return useQuery({
        queryKey: AGENDA_QUERY_KEYS.day(scope, date),
        queryFn: () => agendaRepository.getAgendaDay({ scope, date }),
        staleTime: AGENDA_SYNC_CONFIG.staleTimeMs,
        refetchInterval: AGENDA_SYNC_CONFIG.pollingIntervalMs,
        refetchOnWindowFocus: true,
        placeholderData: keepPreviousData,
        retry: false,
    });
}
/**
 * Mutação para cancelamento de agendamento:
 * DELETE /api/bookings/:bookingId/cancel
 */
export function useCancelBookingMutation(scope) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (bookingId) => {
            var _a, _b, _c, _d;
            if (!(scope === null || scope === void 0 ? void 0 : scope.staffId))
                throw new Error('Selecione uma unidade com vínculo ativo.');
            const booking = await getBookingById(bookingId, 'UNIT');
            if (!booking.version || !((_b = (_a = booking.capabilities) === null || _a === void 0 ? void 0 : _a.cancel) === null || _b === void 0 ? void 0 : _b.allowed))
                throw new Error('Cancelamento indisponível.');
            const attempt = await bookingOperationEngine.prepare({ action: 'CANCEL', actorId: scope.staffId, scope: 'UNIT', bookingId, expectedVersion: booking.version });
            const result = await bookingOperationEngine.submit(attempt);
            if (result.state !== 'APPLIED' || !((_d = (_c = result.resource) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.booking))
                throw new Error('Verifique a operação anterior.');
            return result.resource.data.booking;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEYS.all });
            void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}
