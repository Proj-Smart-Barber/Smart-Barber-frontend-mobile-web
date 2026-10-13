import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useSession, getOperationalContext } from '@/features/auth';
import {
  useUnitBookings,
  listBarbershopProfessionals,
  bookingQueryKeys,
  invalidateBookingQueries,
  type BookingDto,
} from '@/features/bookings';
import type { AgendaAppointmentEntry } from '../api/agenda.contract';
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
import type { AgendaSummaryView } from './agenda.types';

export function useAgendaViewModel() {
  const session = useSession();
  const queryClient = useQueryClient();

  // 1. Contexto operacional estrito
  const operationalContext = useMemo(() => {
    const ctx = getOperationalContext(session);
    return ctx;
  }, [session]);

  const shopId = operationalContext?.shopId;
  const isOwner = operationalContext?.role === 'OWNER';
  const isBarberman = operationalContext?.role === 'BARBERMAN';

  // Leitura e validação dos parâmetros de rota
  const {
    date: paramDate,
    shopId: paramShopId,
    barbermanId: paramBarbermanId,
    bookingId: paramBookingId,
  } = useLocalSearchParams<{
    date?: string;
    shopId?: string;
    barbermanId?: string;
    bookingId?: string;
  }>();

  // Validação segura de data civil (yyyy-MM-dd)
  const validParamDate = useMemo(() => {
    if (paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) && !Number.isNaN(Date.parse(paramDate))) {
      return paramDate;
    }
    return undefined;
  }, [paramDate]);

  // 2. Consulta de profissionais da unidade (para OWNER filtrar e para exibir nomes reais)
  const professionalsQuery = useQuery({
    queryKey: shopId ? bookingQueryKeys.professionals(shopId) : ['disabled-professionals'],
    queryFn: () => (shopId ? listBarbershopProfessionals(shopId) : Promise.resolve([])),
    enabled: Boolean(shopId),
    staleTime: 5 * 60_000,
  });

  const professionals = useMemo(() => {
    return Array.isArray(professionalsQuery.data) ? professionalsQuery.data : [];
  }, [professionalsQuery.data]);

  const professionalsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const prof of professionals) {
      if (prof.id && prof.name) {
        map.set(prof.id, prof.name);
      }
    }
    return map;
  }, [professionals]);

  // Filtro de profissional: BARBERMAN ignora colega; OWNER pode filtrar se for válido
  const validParamBarbermanId = useMemo(() => {
    if (!isOwner || !paramBarbermanId) return undefined;
    return paramBarbermanId;
  }, [isOwner, paramBarbermanId]);

  // Filtro de profissional selecionado pelo OWNER
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(
    validParamBarbermanId ?? null
  );

  // 3. Read Model Canônico de reservas da unidade com filtro inicial validado
  const destinationMismatch = Boolean(paramShopId && paramShopId !== operationalContext?.shopId);
  const unitBookings = useUnitBookings(destinationMismatch ? null : operationalContext, {
    date: validParamDate,
    barbermanId: validParamBarbermanId,
  });
  const setAgendaDate = unitBookings.setSelectedDate;
  const setAgendaProfessional = unitBookings.setBarbermanId;

  // Atualiza data selecionada se rota mudar após montagem
  useEffect(() => {
    if (validParamDate) {
      setAgendaDate(validParamDate);
    }
  }, [validParamDate, setAgendaDate]);

  // Atualiza profissional se rota mudar após montagem
  useEffect(() => {
    if (isOwner && paramBarbermanId !== undefined) {
      const nextId = paramBarbermanId || null;
      setSelectedProfessionalId(nextId);
      setAgendaProfessional(nextId ?? undefined);
    }
  }, [isOwner, paramBarbermanId, setAgendaProfessional]);

  // Aplica filtro de profissional para o OWNER
  const handleSelectProfessional = useCallback(
    (profId: string | null) => {
      setSelectedProfessionalId(profId);
      unitBookings.setBarbermanId(profId ?? undefined);
    },
    [unitBookings]
  );

  // 4. Navegação de Datas
  const selectedDate = unitBookings.selectedDate;
  const todayIso = unitBookings.unitTodayDate || toISODate(new Date());
  const daysFromToday = diffInDays(todayIso, selectedDate || todayIso);
  const isToday = daysFromToday === 0;

  const canGoToPreviousDay = daysFromToday > -AGENDA_SYNC_CONFIG.navigationLimitDays;
  const canGoToNextDay = daysFromToday < AGENDA_SYNC_CONFIG.navigationLimitDays;
  const minSelectableDateIso = addDays(todayIso, -AGENDA_SYNC_CONFIG.navigationLimitDays);
  const maxSelectableDateIso = addDays(todayIso, AGENDA_SYNC_CONFIG.navigationLimitDays);

  const goToDate = useCallback(
    (iso: string) => {
      if (isWithinNavigationLimit(iso, todayIso, AGENDA_SYNC_CONFIG.navigationLimitDays)) {
        unitBookings.setSelectedDate(iso);
      }
    },
    [todayIso, unitBookings]
  );

  const goToPreviousDay = useCallback(() => {
    unitBookings.setSelectedDate(addDays(selectedDate, -1));
  }, [selectedDate, unitBookings]);

  const goToNextDay = useCallback(() => {
    unitBookings.setSelectedDate(addDays(selectedDate, 1));
  }, [selectedDate, unitBookings]);

  const goToToday = useCallback(() => {
    unitBookings.followToday();
  }, [todayIso, unitBookings]);

  // 5. Mapeamento de BookingDto para AgendaAppointmentEntry completo
  const entries = useMemo<AgendaAppointmentEntry[]>(() => {
    return unitBookings.items.map((dto: BookingDto): AgendaAppointmentEntry => {
      const startTime =
        dto.startTime ||
        (dto.startsAt && dto.startsAt.includes('T') ? dto.startsAt.split('T')[1].slice(0, 5) : '00:00');
      const endTime =
        dto.endTime ||
        (dto.endsAt && dto.endsAt.includes('T') ? dto.endsAt.split('T')[1].slice(0, 5) : '00:00');

      const services = Array.isArray(dto.services) ? dto.services : [];
      const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';

      const hasServicePrices = services.some((s) => s.priceInCents != null);
      const calculatedPrice = services.reduce((sum, s) => sum + (s.priceInCents ?? 0), 0);
      const totalPrice =
        dto.totalPriceInCents != null
          ? dto.totalPriceInCents
          : hasServicePrices && calculatedPrice > 0
          ? calculatedPrice
          : null;

      const customerName = dto.customer?.name?.trim() || 'Cliente';
      const profId = dto.barbermanId || '';
      const profName = professionalsMap.get(profId) || dto.barbermanName || '';

      const statusUpper = (dto.status || 'UNKNOWN').toUpperCase();

      return {
        type: 'APPOINTMENT',
        id: dto.id,
        startTime,
        endTime,
        customerName,
        serviceTitle,
        servicePriceInCents: totalPrice,
        professionalId: profId,
        professionalName: profName,
        status: statusUpper as any,
        paymentStatus: null,
        checkedInAt: null,
        hasConflict: false,
        capabilities: dto.capabilities,
        version: dto.version,
        rawBooking: dto,
      };
    });
  }, [unitBookings.items, professionalsMap]);

  // 6. Resumo da Agenda
  const summary = useMemo<AgendaSummaryView | null>(() => {
    const next = unitBookings.nextAppointment
      ? {
          startTime: unitBookings.nextAppointment.startTime,
          customerName: unitBookings.nextAppointment.customerName,
          serviceTitle: unitBookings.nextAppointment.serviceTitle,
          professionalName: unitBookings.nextAppointment.professionalName || '',
        }
      : null;

    const totalBookings = unitBookings.total;
    const occupancyDetail =
      totalBookings !== null && totalBookings > 0
        ? `${totalBookings} reserva${totalBookings === 1 ? '' : 's'} no filtro`
        : null;

    return {
      occupancyPercent: null,
      occupancyLabel: null,
      occupancyDetail,
      next,
    };
  }, [unitBookings.nextAppointment, unitBookings.total]);

  // 7. Detalhes e Ações de Reserva
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    destinationMismatch ? null : paramBookingId ?? null
  );

  useEffect(() => {
    if (destinationMismatch) {
      setSelectedBookingId(null);
    } else if (paramBookingId) {
      setSelectedBookingId(paramBookingId);
    }
  }, [paramBookingId, destinationMismatch]);

  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    actionType: 'CANCEL' | 'COMPLETE' | 'NO_SHOW';
    booking: BookingDto;
  } | null>(null);

  const openDetail = useCallback((bookingId: string) => {
    setSelectedBookingId(bookingId);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedBookingId(null);
  }, []);

  const handleOpenActionConfirm = useCallback(
    (actionType: 'CANCEL' | 'COMPLETE' | 'NO_SHOW', booking: BookingDto) => {
      setActionConfirm({
        isOpen: true,
        actionType,
        booking,
      });
    },
    []
  );

  const closeActionConfirm = useCallback(() => {
    setActionConfirm(null);
  }, []);

  const handleActionSuccess = useCallback(async () => {
    if (operationalContext) {
      await invalidateBookingQueries(queryClient, {
        actorId: operationalContext.userId,
        shopId: operationalContext.shopId,
        bookingId: actionConfirm?.booking.id,
      });
    }
    setActionConfirm(null);
    await unitBookings.refetch();
  }, [queryClient, operationalContext, actionConfirm?.booking.id, unitBookings]);

  // Para compatibilidade com a prop onCancel antiga do AgendaAppointmentCard
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const handleCancelBooking = useCallback(
    (bookingId: string) => {
      const item = unitBookings.items.find((b) => b.id === bookingId);
      if (item) {
        handleOpenActionConfirm('CANCEL', item);
      }
    },
    [unitBookings.items, handleOpenActionConfirm]
  );

  // Estados de erro e sincronização
  const isInitialLoading = unitBookings.isLoading && unitBookings.items.length === 0;
  const isUpdatingDate = unitBookings.isFetching && !unitBookings.isLoading;
  const isRefreshing = unitBookings.isRefreshing;

  const isFatalError = destinationMismatch || unitBookings.isError && unitBookings.items.length === 0;
  const isErrorWithCachedData = unitBookings.isError && unitBookings.items.length > 0;

  const errorTitle = destinationMismatch ? 'Selecione a unidade do agendamento' : 'Não foi possível carregar as reservas da unidade.';
  const errorDescription =
    destinationMismatch ? 'O resultado pertence a outra unidade. Selecione explicitamente essa unidade antes de abrir a Agenda.' : unitBookings.error?.message || 'Verifique sua conexão ou tente novamente em instantes.';

  const isDataStale = unitBookings.isDataStale;
  const lastUpdatedAtLabel = unitBookings.lastAcceptedSyncAtMs
    ? formatLastUpdated(unitBookings.lastAcceptedSyncAtMs)
    : null;

  return {
    // Contexto
    operationalContext,
    isOwner,
    isBarberman,
    isUnitActive: unitBookings.isUnitActive,
    barbershopName: session.barbershop?.name || 'Unidade Atual',
    professionals,
    selectedProfessionalId,
    onSelectProfessional: handleSelectProfessional,

    // Navegação de data
    selectedDate,
    dateLabel: formatDateLabel(selectedDate || todayIso),
    dateLabelShort: formatDateLabelShort(selectedDate || todayIso),
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

    // Dados da Agenda
    entries,
    summary,
    isClosed: false,
    totalBookings: unitBookings.total,
    isPartial: unitBookings.isPartial,
    hasNext: unitBookings.hasNext,
    loadMore: unitBookings.loadMore,
    loadMoreError: unitBookings.loadMoreError,
    isLoadingMore: unitBookings.isLoadingMore,

    // Estados de carregamento
    isInitialLoading,
    isUpdatingDate,
    isRefreshing,

    // Erros
    isFatalError,
    isErrorWithCachedData,
    errorTitle,
    errorDescription,

    // Sincronização
    lastUpdatedAtLabel,
    isDataStale,
    isSlowSync: unitBookings.isSlowSync,
    handleRefresh: unitBookings.refetch,

    // Detalhe e Ações UNIT
    selectedBookingId,
    openDetail,
    closeDetail,
    actionConfirm,
    handleOpenActionConfirm,
    closeActionConfirm,
    handleActionSuccess,

    // Compatibilidade
    handleCancelBooking,
    cancellingId,
  };
}
