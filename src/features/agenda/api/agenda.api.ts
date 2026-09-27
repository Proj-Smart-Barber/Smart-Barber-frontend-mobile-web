import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AGENDA_SYNC_CONFIG } from '../model/agenda-state';
import type { AgendaDay, AgendaScope, IAgendaRepository } from './agenda.contract';
import { AgendaMockAdapter } from './agenda.mock';

// Port / Adapter singleton (substituir por AgendaHttpAdapter quando a API estiver pronta).
export const agendaRepository: IAgendaRepository = new AgendaMockAdapter();

export const AGENDA_QUERY_KEYS = {
  all: ['agenda'] as const,
  day: (scope: AgendaScope, date: string) =>
    ['agenda', 'day', scope.role, scope.staffId, date] as const,
};

/**
 * Consulta do dia da agenda.
 *
 * - polling de 60s (pausado quando o app perde foco);
 * - refetch ao retomar o foco na Web (override local do default global);
 * - keepPreviousData para navegar entre dias sem flash de skeleton;
 * - retry: false, mantendo a decisão global do app.
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
