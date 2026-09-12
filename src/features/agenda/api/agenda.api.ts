import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AGENDA_SYNC_CONFIG } from '../model/agenda-state';
import type {
  AgendaBooking,
  AgendaBookingDetails,
  IBookingScheduleRepository,
} from './agenda.contract';
import { BookingScheduleHttpAdapter } from './agenda.http';

// Port / Adapter singleton apontando para a API real de Booking.
export const agendaRepository: IBookingScheduleRepository = new BookingScheduleHttpAdapter();

export const AGENDA_QUERY_KEYS = {
  all: ['agenda'] as const,
  schedule: (date: string) => ['agenda', 'schedule', date] as const,
  scheduleDetails: (date: string) => ['agenda', 'schedule', 'details', date] as const,
};

/**
 * Consulta da agenda detalhada do barbeiro (cliente + serviços).
 *
 * - polling de 60s (pausado quando o app perde foco);
 * - refetch ao retomar o foco na Web (override local do default global);
 * - keepPreviousData para navegar entre dias sem flash de skeleton;
 * - retry: false, mantendo a decisão global do app.
 */
export function useAgendaDayQuery(date: string) {
  return useQuery<AgendaBookingDetails[]>({
    queryKey: AGENDA_QUERY_KEYS.scheduleDetails(date),
    queryFn: () => agendaRepository.getDailyScheduleWithDetails({ date }),
    staleTime: AGENDA_SYNC_CONFIG.staleTimeMs,
    refetchInterval: AGENDA_SYNC_CONFIG.pollingIntervalMs,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/**
 * Consulta da agenda simples do barbeiro (apenas intervalos).
 * Habilitada sob demanda pelo modo "Simples" da tela.
 */
export function useAgendaSimpleDayQuery(date: string, options: { enabled?: boolean } = {}) {
  return useQuery<AgendaBooking[]>({
    queryKey: AGENDA_QUERY_KEYS.schedule(date),
    queryFn: () => agendaRepository.getDailySchedule({ date }),
    enabled: options.enabled ?? true,
    staleTime: AGENDA_SYNC_CONFIG.staleTimeMs,
    refetchInterval: AGENDA_SYNC_CONFIG.pollingIntervalMs,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

/**
 * Cancelamento de um agendamento do dia.
 * Ao concluir, invalida as queries da agenda (detalhada e simples)
 * para refletir a remoção na timeline.
 */
export function useCancelBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation<AgendaBooking, Error, string>({
    mutationFn: (bookingId) => agendaRepository.cancelBooking(bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AGENDA_QUERY_KEYS.all });
    },
  });
}
