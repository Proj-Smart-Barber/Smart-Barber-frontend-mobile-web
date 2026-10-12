import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/features/auth';
import { useToast } from '@/shared/ui';
import {
  addDays,
  diffInDays,
  formatDateLabel,
  formatDateLabelShort,
  formatLastUpdated,
  isWithinNavigationLimit,
  minutesBetween,
  sortAgendaEntriesChronologically,
  toISODate,
} from '@/features/agenda';
import {
  useCancelBookingMutation,
  useDayBookingsQuery,
  useUpdateBookingMutation,
} from '../api/bookings.api';
import { normalizeBookingsError } from '../api/normalize-bookings-error';
import type { BookingDetails, UpdateBookingInput } from '../api/bookings.contract';
import { BOOKINGS_SYNC_CONFIG } from './bookings-state';

export interface BookingActionResult {
  ok: boolean;
  message: string | null;
}

export function useBookingsViewModel() {
  const { signOut } = useSession();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));

  const todayIso = toISODate(new Date());
  const daysFromToday = diffInDays(todayIso, selectedDate);
  const isToday = daysFromToday === 0;
  const canGoToPreviousDay = daysFromToday > -BOOKINGS_SYNC_CONFIG.navigationLimitDays;
  const canGoToNextDay = daysFromToday < BOOKINGS_SYNC_CONFIG.navigationLimitDays;
  const minSelectableDateIso = addDays(todayIso, -BOOKINGS_SYNC_CONFIG.navigationLimitDays);
  const maxSelectableDateIso = addDays(todayIso, BOOKINGS_SYNC_CONFIG.navigationLimitDays);

  const goToDate = useCallback(
    (iso: string) => {
      if (isWithinNavigationLimit(iso, todayIso, BOOKINGS_SYNC_CONFIG.navigationLimitDays)) {
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

  const dayQuery = useDayBookingsQuery(selectedDate);

  const handleRefresh = useCallback(() => {
    void dayQuery.refetch();
  }, [dayQuery]);

  const bookingsRaw = dayQuery.data ?? null;
  const showsDataForSelectedDate = bookingsRaw !== null && !dayQuery.isPlaceholderData;

  const bookings = useMemo<BookingDetails[]>(
    () =>
      showsDataForSelectedDate
        ? sortAgendaEntriesChronologically(bookingsRaw)
        : ([] as BookingDetails[]),
    [bookingsRaw, showsDataForSelectedDate],
  );

  const totals = useMemo(() => {
    const count = bookings.length;
    let durationMinutes = 0;
    let priceInCents = 0;

    for (const booking of bookings) {
      durationMinutes += Math.max(0, minutesBetween(booking.startTime, booking.endTime));
      for (const service of booking.services) {
        priceInCents += service.priceInCents ?? 0;
      }
    }

    return { count, durationMinutes, priceInCents };
  }, [bookings]);

  const isInitialLoading = dayQuery.isLoading && !dayQuery.isPlaceholderData;
  const isFetching = dayQuery.isFetching;
  const isUpdatingDate = isFetching && dayQuery.isPlaceholderData;
  const isRefreshing = isFetching && !isInitialLoading;

  const isError = dayQuery.isError;
  const isFatalError = isError && !showsDataForSelectedDate;
  const isErrorWithCachedData = isError && showsDataForSelectedDate;
  const normalizedError = useMemo(
    () => (dayQuery.error ? normalizeBookingsError(dayQuery.error) : null),
    [dayQuery.error],
  );

  const lastUpdatedAtLabel = showsDataForSelectedDate
    ? formatLastUpdated(dayQuery.dataUpdatedAt)
    : null;
  const isDataStale =
    showsDataForSelectedDate &&
    !isFetching &&
    Date.now() - dayQuery.dataUpdatedAt > BOOKINGS_SYNC_CONFIG.staleDataThresholdMs;

  const [isSlowSync, setIsSlowSync] = useState(false);
  useEffect(() => {
    if (!isFetching || !showsDataForSelectedDate) {
      setIsSlowSync(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowSync(true), BOOKINGS_SYNC_CONFIG.slowSyncThresholdMs);
    return () => clearTimeout(timer);
  }, [isFetching, showsDataForSelectedDate]);

  useEffect(() => {
    if (normalizedError?.isSessionExpired) {
      void signOut();
    }
  }, [normalizedError, signOut]);

  const updateMutation = useUpdateBookingMutation();
  const cancelMutation = useCancelBookingMutation();

  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<{ bookingId: string; message: string } | null>(
    null,
  );
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{ bookingId: string; message: string } | null>(
    null,
  );

  const handleUpdateBooking = useCallback(
    async (input: UpdateBookingInput): Promise<BookingActionResult> => {
      setUpdatingBookingId(input.bookingId);
      try {
        await updateMutation.mutateAsync(input);
        setUpdateError(null);
        showToast({
          type: 'success',
          title: 'Atendimento remarcado',
          message: `Novo horário: ${input.startTime}–${input.endTime}.`,
        });
        return { ok: true, message: null };
      } catch (error) {
        const normalized = normalizeBookingsError(error);
        setUpdateError({ bookingId: input.bookingId, message: normalized.description });
        if (normalized.isSessionExpired) {
          void signOut();
        }
        return { ok: false, message: normalized.description };
      } finally {
        setUpdatingBookingId(null);
      }
    },
    [updateMutation, showToast, signOut],
  );

  const handleCancelBooking = useCallback(
    async (bookingId: string): Promise<BookingActionResult> => {
      setCancellingId(bookingId);
      try {
        await cancelMutation.mutateAsync(bookingId);
        setCancelError(null);
        showToast({
          type: 'success',
          title: 'Atendimento cancelado',
          message: 'O horário voltou a ficar disponível na sua agenda.',
        });
        return { ok: true, message: null };
      } catch (error) {
        const normalized = normalizeBookingsError(error);
        setCancelError({ bookingId, message: normalized.description });
        if (normalized.isSessionExpired) {
          void signOut();
        }
        return { ok: false, message: normalized.description };
      } finally {
        setCancellingId(null);
      }
    },
    [cancelMutation, showToast, signOut],
  );

  const clearCancelError = useCallback((bookingId: string) => {
    setCancelError((current) => (current?.bookingId === bookingId ? null : current));
  }, []);

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
    bookings,
    totals,

    // Estados de carregamento
    isInitialLoading,
    isUpdatingDate,
    isRefreshing,

    // Erros
    isFatalError,
    isErrorWithCachedData,
    errorTitle: normalizedError?.title ?? 'Não foi possível carregar seus atendimentos.',
    errorDescription: normalizedError?.description ?? 'Tente novamente em instantes.',

    // Sincronização
    lastUpdatedAtLabel,
    isDataStale,
    isSlowSync,
    handleRefresh,

    // Remarcação
    handleUpdateBooking,
    updatingBookingId,
    updateError,

    // Cancelamento
    handleCancelBooking,
    cancellingId,
    cancelError,
    clearCancelError,
  };
}
