/**
 * View model da Agenda do barbeiro.
 *
 * A API é a fonte de verdade: o barbeiro é resolvido pelo JWT no
 * backend, então a consulta é apenas por data. Dois modos:
 * - `details` (padrão): agenda detalhada (cliente + serviços);
 * - `simple`: agenda simples (apenas id e intervalos).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/features/auth';
import { useAgendaDayQuery, useAgendaSimpleDayQuery, useCancelBookingMutation } from '../api/agenda.api';
import { normalizeAgendaError } from '../api/normalize-agenda-error';
import type { AgendaBooking, AgendaBookingDetails, AgendaViewMode } from '../api/agenda.contract';
import { AGENDA_SYNC_CONFIG } from './agenda-state';
import {
  addDays,
  diffInDays,
  formatDateLabel,
  formatDateLabelShort,
  formatLastUpdated,
  isWithinNavigationLimit,
  toISODate,
} from './agenda.helpers';
import { buildAgendaSummaryView } from './agenda.types';

export function useAgendaViewModel() {
  const { signOut } = useSession();
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [mode, setMode] = useState<AgendaViewMode>('details');

  const detailsQuery = useAgendaDayQuery(selectedDate);
  const simpleQuery = useAgendaSimpleDayQuery(selectedDate, { enabled: mode === 'simple' });
  const cancelBookingMutation = useCancelBookingMutation();

  const activeQuery = mode === 'simple' ? simpleQuery : detailsQuery;

  const todayIso = toISODate(new Date());
  const daysFromToday = diffInDays(todayIso, selectedDate);
  const isToday = daysFromToday === 0;
  const canGoToPreviousDay = daysFromToday > -AGENDA_SYNC_CONFIG.navigationLimitDays;
  const canGoToNextDay = daysFromToday < AGENDA_SYNC_CONFIG.navigationLimitDays;
  const minSelectableDateIso = addDays(todayIso, -AGENDA_SYNC_CONFIG.navigationLimitDays);
  const maxSelectableDateIso = addDays(todayIso, AGENDA_SYNC_CONFIG.navigationLimitDays);

  const goToDate = useCallback(
    (iso: string) => {
      if (isWithinNavigationLimit(iso, todayIso, AGENDA_SYNC_CONFIG.navigationLimitDays)) {
        setSelectedDate(iso);
      }
    },
    [todayIso],
  );

  const goToPreviousDay = useCallback(() => {
    setSelectedDate((current) => addDays(current, -1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((current) => addDays(current, 1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(todayIso);
  }, [todayIso]);

  const handleRefresh = useCallback(() => {
    void activeQuery.refetch();
  }, [activeQuery]);

  const { mutate: cancelBooking } = cancelBookingMutation;

  const handleCancelBooking = useCallback(
    (bookingId: string) => {
      cancelBooking(bookingId);
    },
    [cancelBooking],
  );

  const details: AgendaBookingDetails[] = detailsQuery.data ?? [];
  const simpleBookings: AgendaBooking[] = simpleQuery.data ?? [];

  // Com keepPreviousData, `data` pode ser do dia anterior durante a
  // atualização — só é "dado do dia selecionado" quando não é placeholder.
  const showsDataForSelectedDate =
    activeQuery.data !== undefined && !activeQuery.isPlaceholderData;

  const summary = useMemo(
    () =>
      mode === 'details'
        ? buildAgendaSummaryView(details, { isToday, isFuture: daysFromToday > 0 })
        : null,
    [mode, details, isToday, daysFromToday],
  );

  const isInitialLoading = activeQuery.isLoading && !activeQuery.isPlaceholderData;
  const isFetching = activeQuery.isFetching;
  const isUpdatingDate = isFetching && activeQuery.isPlaceholderData;
  const isRefreshing = isFetching && !isInitialLoading;

  const isError = activeQuery.isError;
  const isFatalError = isError && !showsDataForSelectedDate;
  const isErrorWithCachedData = isError && showsDataForSelectedDate;
  const normalizedError = useMemo(
    () => (activeQuery.error ? normalizeAgendaError(activeQuery.error) : null),
    [activeQuery.error],
  );

  const normalizedCancelError = useMemo(
    () => (cancelBookingMutation.error ? normalizeAgendaError(cancelBookingMutation.error) : null),
    [cancelBookingMutation.error],
  );

  const isSessionExpired =
    (normalizedError?.isSessionExpired ?? false) ||
    (normalizedCancelError?.isSessionExpired ?? false);

  // Token inválido/expirado (401, ou 500 com erro de JWT vindo do back):
  // encerra a sessão para o guard de rotas redirecionar ao login.
  useEffect(() => {
    if (isSessionExpired) {
      void signOut();
    }
  }, [isSessionExpired, signOut]);

  const lastUpdatedAtLabel = showsDataForSelectedDate
    ? formatLastUpdated(activeQuery.dataUpdatedAt)
    : null;
  const isDataStale =
    showsDataForSelectedDate &&
    !isFetching &&
    Date.now() - activeQuery.dataUpdatedAt > AGENDA_SYNC_CONFIG.staleDataThresholdMs;

  // Detecção de sincronização lenta: fetch em andamento acima do
  // threshold enquanto existem dados em cache para exibir.
  const [isSlowSync, setIsSlowSync] = useState(false);
  useEffect(() => {
    if (!isFetching || !showsDataForSelectedDate) {
      setIsSlowSync(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowSync(true), AGENDA_SYNC_CONFIG.slowSyncThresholdMs);
    return () => clearTimeout(timer);
  }, [isFetching, showsDataForSelectedDate]);

  return {
    // Navegação de data
    selectedDate,
    dateLabel: formatDateLabel(selectedDate),
    dateLabelShort: formatDateLabelShort(selectedDate),
    todayIso,
    minSelectableDateIso,
    maxSelectableDateIso,
    isToday,
    canGoToPreviousDay,
    canGoToNextDay,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,

    // Modo de visualização
    mode,
    setMode,

    // Dados do dia
    details,
    simpleBookings,
    summary,

    // Estados de carregamento
    isInitialLoading,
    isUpdatingDate,
    isRefreshing,

    // Erros
    isFatalError,
    isErrorWithCachedData,
    errorTitle: normalizedError?.title ?? 'Não foi possível carregar sua agenda.',
    errorDescription: normalizedError?.description ?? 'Tente novamente em instantes.',

    // Sincronização
    lastUpdatedAtLabel,
    isDataStale,
    isSlowSync,
    handleRefresh,

    // Cancelamento
    handleCancelBooking,
    cancellingBookingId: cancelBookingMutation.isPending
      ? (cancelBookingMutation.variables ?? null)
      : null,
    cancelErrorBookingId: cancelBookingMutation.isError
      ? (cancelBookingMutation.variables ?? null)
      : null,
    cancelErrorMessage: normalizedCancelError?.description ?? null,
  };
}
