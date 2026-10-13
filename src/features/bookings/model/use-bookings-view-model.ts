import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { fetchUnitBookings } from '../api/bookings.api';
import type { BookingDto } from '../api/bookings.dto';
import type { BookingDetails, UpdateBookingInput } from '../api/bookings.contract';
import { normalizeBookingsError } from '../api/normalize-bookings-error';
import { normalizeBookingError } from '../lib/normalize-booking-error';
import { bookingOperationEngine } from './booking-operation-engine';
import { bookingQueryKeys, invalidateBookingQueries } from './booking-query-keys';
import { BOOKINGS_SYNC_CONFIG } from './bookings-state';

export interface BookingActionResult {
  ok: boolean;
  message: string | null;
}

export function useBookingsViewModel() {
  const session = useSession();
  const { signOut, selectedShopId, identity, isOwner } = session;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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

  // Contexto operacional derivado da sessão autenticada
  const operationalContext = useMemo(() => {
    if (!identity?.id || !selectedShopId) return null;
    const currentMembership = session.memberships?.find((m) => m.id === selectedShopId);
    const role =
      currentMembership?.role === 'BARBER' || currentMembership?.role === 'BARBERMAN'
        ? 'BARBERMAN'
        : currentMembership?.role === 'OWNER'
        ? 'OWNER'
        : null;

    if (!role || (currentMembership?.state != null && currentMembership.state !== 'ACTIVE')) return null;

    return {
      userId: identity.id,
      shopId: selectedShopId,
      role,
      timezone: currentMembership?.timezone || 'America/Sao_Paulo',
    };
  }, [identity?.id, selectedShopId, session.memberships]);

  const shopId = operationalContext?.shopId;
  const userId = operationalContext?.userId;
  const isBarber = operationalContext?.role === 'BARBERMAN';

  // Consulta paginada dos atendimentos da unidade via React Query
  const dayQuery = useQuery({
    queryKey: bookingQueryKeys.unitBookings(shopId ?? 'unknown', {
      date: selectedDate,
      barbermanId: isBarber ? userId : undefined,
    }, userId),
    queryFn: async () => {
      if (!shopId) return { items: [] as BookingDto[] };
      return fetchUnitBookings(shopId, {
        date: selectedDate,
        barbermanId: isBarber ? userId : undefined,
        limit: 100,
      });
    },
    enabled: Boolean(shopId && userId),
    placeholderData: (previousData) => previousData,
  });

  const handleRefresh = useCallback(() => {
    void dayQuery.refetch();
  }, [dayQuery]);

  // Mapeamento dos itens recebidos para BookingDetails
  const bookingsRaw = useMemo<BookingDetails[]>(() => {
    const items = dayQuery.data?.items;
    if (!items || !Array.isArray(items)) return [];

    return items.map((dto: BookingDto): BookingDetails => {
      const startTime =
        dto.startTime ||
        (dto.startsAt && dto.startsAt.includes('T') ? dto.startsAt.split('T')[1].slice(0, 5) : '00:00') ||
        '00:00';
      const endTime =
        dto.endTime ||
        (dto.endsAt && dto.endsAt.includes('T') ? dto.endsAt.split('T')[1].slice(0, 5) : '00:00') ||
        '00:00';
      const dateStr =
        typeof dto.date === 'string'
          ? dto.date.slice(0, 10)
          : dto.date instanceof Date
          ? dto.date.toISOString().slice(0, 10)
          : dto.startsAt
          ? dto.startsAt.slice(0, 10)
          : selectedDate;

      return {
        id: dto.id,
        date: dateStr,
        startTime,
        endTime,
        barbershopId: dto.barbershopId,
        barbermanId: dto.barbermanId,
        createdAt: dto.createdAt ? String(dto.createdAt) : null,
        status: dto.status ?? null,
        version: dto.version ?? null,
        startsAt: dto.startsAt ?? null,
        endsAt: dto.endsAt ?? null,
        timezone: dto.timezone ?? null,
        capabilities: dto.capabilities,
        customer: {
          id: dto.customer?.id ?? dto.customerId ?? undefined,
          name: dto.customer?.name?.trim() || 'Cliente',
          phoneNumber: dto.customer?.phoneNumber?.trim() || '',
        },
        services: (dto.services || []).map((s) => ({
          id: s.id || s.serviceId || 'svc',
          title: s.title,
          priceInCents: s.priceInCents ?? null,
          durationInMinutes: s.durationInMinutes ?? null,
        })),
      };
    });
  }, [dayQuery.data?.items, selectedDate]);

  const showsDataForSelectedDate = dayQuery.data !== undefined && !dayQuery.isPlaceholderData;

  const bookings = useMemo<BookingDetails[]>(
    () => (showsDataForSelectedDate ? sortAgendaEntriesChronologically(bookingsRaw) : []),
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

    const summary = dayQuery.data && 'summary' in dayQuery.data ? dayQuery.data.summary : undefined;
    const incomplete = bookings.some(b => b.services.some(s => s.priceInCents == null));
    return { count: summary?.totalBookings ?? count, durationMinutes, priceInCents: summary ? (summary.hasIncompleteData ? null : summary.totalRevenueInCents) : incomplete ? null : priceInCents };
  }, [bookings, dayQuery.data]);

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

  const [recoveryRequestId, setRecoveryRequestId] = useState<string | null>(null);
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
      if (!operationalContext) {
        return { ok: false, message: 'Contexto operacional indisponível.' };
      }

      setUpdatingBookingId(input.bookingId);
      try {
        const currentItem = dayQuery.data?.items.find((b) => b.id === input.bookingId);
        const expectedVersion = currentItem?.version;
        if (!expectedVersion || expectedVersion < 1) {
          throw new Error('Atualize a lista antes de remarcar este agendamento.');
        }

        const prep = await bookingOperationEngine.prepare({
          action: 'RESCHEDULE',
          bookingId: input.bookingId,
          actorId: operationalContext.userId,
          shopId: operationalContext.shopId,
          expectedVersion,
          scope: 'UNIT',
          date: input.date,
          startTime: input.startTime,
        });

        const submitRes = await bookingOperationEngine.submit(prep);
        if (submitRes.state !== 'APPLIED') {
          throw new Error('Falha ao remarcar o agendamento.');
        }

        await invalidateBookingQueries(queryClient, {
          actorId: operationalContext.userId,
          shopId: operationalContext.shopId,
          bookingId: input.bookingId,
          dates: [selectedDate, input.date],
        });

        setUpdateError(null);
        showToast({
          type: 'success',
          title: 'Atendimento remarcado',
          message: `Novo horário: ${input.startTime}–${input.endTime}.`,
        });
        return { ok: true, message: null };
      } catch (error) {
        if ((error as any)?.requestId) setRecoveryRequestId((error as any).requestId);
        const normalized = normalizeBookingError(error);
        setUpdateError({ bookingId: input.bookingId, message: normalized.message });
        if (normalized.statusCode === 401) {
          void signOut();
        }
        return { ok: false, message: normalized.message };
      } finally {
        setUpdatingBookingId(null);
      }
    },
    [operationalContext, dayQuery.data?.items, queryClient, selectedDate, showToast, signOut],
  );

  const handleCancelBooking = useCallback(
    async (bookingId: string): Promise<BookingActionResult> => {
      if (!operationalContext) {
        return { ok: false, message: 'Contexto operacional indisponível.' };
      }

      setCancellingId(bookingId);
      try {
        const currentItem = dayQuery.data?.items.find((b) => b.id === bookingId);
        const expectedVersion = currentItem?.version;
        if (!expectedVersion || expectedVersion < 1) {
          throw new Error('Atualize a lista antes de cancelar este agendamento.');
        }

        const prep = await bookingOperationEngine.prepare({
          action: 'CANCEL',
          bookingId,
          actorId: operationalContext.userId,
          shopId: operationalContext.shopId,
          expectedVersion,
          scope: 'UNIT',
          reason: 'Cancelado pelo profissional na gestão de atendimentos',
        });

        const submitRes = await bookingOperationEngine.submit(prep);
        if (submitRes.state !== 'APPLIED') {
          throw new Error('Falha ao cancelar o agendamento.');
        }

        await invalidateBookingQueries(queryClient, {
          actorId: operationalContext.userId,
          shopId: operationalContext.shopId,
          bookingId,
          dates: [selectedDate],
        });

        setCancelError(null);
        showToast({
          type: 'success',
          title: 'Atendimento cancelado',
          message: 'O horário voltou a ficar disponível na sua agenda.',
        });
        return { ok: true, message: null };
      } catch (error) {
        if ((error as any)?.requestId) setRecoveryRequestId((error as any).requestId);
        const normalized = normalizeBookingError(error);
        setCancelError({ bookingId, message: normalized.message });
        if (normalized.statusCode === 401) {
          void signOut();
        }
        return { ok: false, message: normalized.message };
      } finally {
        setCancellingId(null);
      }
    },
    [operationalContext, dayQuery.data?.items, queryClient, selectedDate, showToast, signOut],
  );

  const clearCancelError = useCallback((bookingId: string) => {
    setCancelError((current) => (current?.bookingId === bookingId ? null : current));
  }, []);

  return {
    recoveryRequestId,
    resolveRecovery: () => { setRecoveryRequestId(null); void dayQuery.refetch(); },
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
