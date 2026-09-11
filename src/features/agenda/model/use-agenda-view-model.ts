import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/features/auth';
import { useAgendaDayQuery } from '../api/agenda.api';
import { normalizeAgendaError } from '../api/normalize-agenda-error';
import type { AgendaScope } from '../api/agenda.contract';
import { AGENDA_SYNC_CONFIG } from './agenda-state';
import {
  addDays,
  diffInDays,
  formatDateLabel,
  formatDateLabelShort,
  formatLastUpdated,
  isWithinNavigationLimit,
  sortAgendaEntriesChronologically,
  toISODate,
} from './agenda.helpers';
import { buildAgendaSummaryView } from './agenda.types';

export function useAgendaViewModel() {
  const { staff } = useSession();
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));

  const scope = useMemo<AgendaScope>(
    () => ({
      role: staff?.role === 'OWNER' ? 'OWNER' : 'BARBER',
      staffId: staff?.id ?? 'default-staff-id',
    }),
    [staff?.role, staff?.id],
  );

  const dayQuery = useAgendaDayQuery(scope, selectedDate);

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
    void dayQuery.refetch();
  }, [dayQuery]);

  const day = dayQuery.data ?? null;
  // Com keepPreviousData, `data` pode ser do dia anterior durante a
  // atualização — só é "dado do dia selecionado" quando não é placeholder.
  const showsDataForSelectedDate = day !== null && !dayQuery.isPlaceholderData;

  const entries = useMemo(
    () => sortAgendaEntriesChronologically(day?.entries ?? []),
    [day?.entries],
  );

  const summary = useMemo(() => buildAgendaSummaryView(day?.summary ?? null), [day?.summary]);

  const isInitialLoading = dayQuery.isLoading && !dayQuery.isPlaceholderData;
  const isFetching = dayQuery.isFetching;
  const isUpdatingDate = isFetching && dayQuery.isPlaceholderData;
  const isRefreshing = isFetching && !isInitialLoading;

  const isError = dayQuery.isError;
  const isFatalError = isError && !showsDataForSelectedDate;
  const isErrorWithCachedData = isError && showsDataForSelectedDate;
  const normalizedError = useMemo(
    () => (dayQuery.error ? normalizeAgendaError(dayQuery.error) : null),
    [dayQuery.error],
  );

  const lastUpdatedAtLabel = showsDataForSelectedDate
    ? formatLastUpdated(dayQuery.dataUpdatedAt)
    : null;
  const isDataStale =
    showsDataForSelectedDate &&
    !isFetching &&
    Date.now() - dayQuery.dataUpdatedAt > AGENDA_SYNC_CONFIG.staleDataThresholdMs;

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

    // Dados do dia
    entries,
    summary,
    isClosed: day?.summary.isClosed ?? false,

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
  };
}
