import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AGENDA_SYNC_CONFIG } from '../model/agenda-state';
import type { AgendaDay, AgendaScope, IAgendaRepository } from './agenda.contract';
import { AgendaMockAdapter } from './agenda.mock';
import { AgendaHttpAdapter, bookingScheduleHttpAdapter } from './agenda.http';
import { ENV } from '@/shared/config/env';

// Port / Adapter singleton: usa AgendaHttpAdapter por padrão no ambiente HTTP
export const agendaRepository: IAgendaRepository =
  ENV.AVAILABILITY_SOURCE === 'mock'
    ? new AgendaMockAdapter()
    : new AgendaHttpAdapter();

export const AGENDA_QUERY_KEYS = {
  all: ['agenda'] as const,
  day: (scope: AgendaScope, date: string) =>
    ['agenda', 'day', scope.role, scope.staffId, date] as const,
};

/**
 * Consulta do dia da agenda.
 */
export function useAgendaDayQuery(scope: AgendaScope, date: string) {
  return useQuery<AgendaDay>({
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
export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingScheduleHttpAdapter.cancelBooking(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
