import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../auth';
import { useToast } from '../../../shared/ui';
import { addDays, diffInDays, formatDateLabel, formatDateLabelShort, formatLastUpdated, isWithinNavigationLimit, minutesBetween, sortAgendaEntriesChronologically, toISODate, } from '../../agenda/model/agenda.helpers';
import { fetchUnitBookings } from '../api/bookings.api';
import { normalizeBookingsError } from '../api/normalize-bookings-error';
import { normalizeBookingError } from '../lib/normalize-booking-error';
import { bookingOperationEngine } from './booking-operation-engine';
import { bookingQueryKeys, invalidateBookingQueries } from './booking-query-keys';
import { BOOKINGS_SYNC_CONFIG } from './bookings-state';
export function useBookingsViewModel() {
    var _a, _b, _c, _d, _e;
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
    const goToDate = useCallback((iso) => {
        if (isWithinNavigationLimit(iso, todayIso, BOOKINGS_SYNC_CONFIG.navigationLimitDays)) {
            setSelectedDate(iso);
        }
    }, [todayIso]);
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
        var _a;
        if (!(identity === null || identity === void 0 ? void 0 : identity.id) || !selectedShopId)
            return null;
        const currentMembership = (_a = session.memberships) === null || _a === void 0 ? void 0 : _a.find((m) => m.id === selectedShopId);
        const role = (currentMembership === null || currentMembership === void 0 ? void 0 : currentMembership.role) === 'BARBER' || (currentMembership === null || currentMembership === void 0 ? void 0 : currentMembership.role) === 'BARBERMAN'
            ? 'BARBERMAN'
            : (currentMembership === null || currentMembership === void 0 ? void 0 : currentMembership.role) === 'OWNER'
                ? 'OWNER'
                : null;
        if (!role || ((currentMembership === null || currentMembership === void 0 ? void 0 : currentMembership.state) != null && currentMembership.state !== 'ACTIVE'))
            return null;
        return {
            userId: identity.id,
            shopId: selectedShopId,
            role,
            timezone: (currentMembership === null || currentMembership === void 0 ? void 0 : currentMembership.timezone) || 'America/Sao_Paulo',
        };
    }, [identity === null || identity === void 0 ? void 0 : identity.id, selectedShopId, session.memberships]);
    const shopId = operationalContext === null || operationalContext === void 0 ? void 0 : operationalContext.shopId;
    const userId = operationalContext === null || operationalContext === void 0 ? void 0 : operationalContext.userId;
    const isBarber = (operationalContext === null || operationalContext === void 0 ? void 0 : operationalContext.role) === 'BARBERMAN';
    // Consulta paginada dos atendimentos da unidade via React Query
    const dayQuery = useQuery({
        queryKey: bookingQueryKeys.unitBookings(shopId !== null && shopId !== void 0 ? shopId : 'unknown', {
            date: selectedDate,
            barbermanId: isBarber ? userId : undefined,
        }, userId),
        queryFn: async () => {
            if (!shopId)
                return { items: [] };
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
    const bookingsRaw = useMemo(() => {
        var _a;
        const items = (_a = dayQuery.data) === null || _a === void 0 ? void 0 : _a.items;
        if (!items || !Array.isArray(items))
            return [];
        return items.map((dto) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            const startTime = dto.startTime ||
                (dto.startsAt && dto.startsAt.includes('T') ? dto.startsAt.split('T')[1].slice(0, 5) : '00:00') ||
                '00:00';
            const endTime = dto.endTime ||
                (dto.endsAt && dto.endsAt.includes('T') ? dto.endsAt.split('T')[1].slice(0, 5) : '00:00') ||
                '00:00';
            const dateStr = typeof dto.date === 'string'
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
                status: (_a = dto.status) !== null && _a !== void 0 ? _a : null,
                version: (_b = dto.version) !== null && _b !== void 0 ? _b : null,
                startsAt: (_c = dto.startsAt) !== null && _c !== void 0 ? _c : null,
                endsAt: (_d = dto.endsAt) !== null && _d !== void 0 ? _d : null,
                timezone: (_e = dto.timezone) !== null && _e !== void 0 ? _e : null,
                capabilities: dto.capabilities,
                customer: {
                    id: (_h = (_g = (_f = dto.customer) === null || _f === void 0 ? void 0 : _f.id) !== null && _g !== void 0 ? _g : dto.customerId) !== null && _h !== void 0 ? _h : undefined,
                    name: ((_k = (_j = dto.customer) === null || _j === void 0 ? void 0 : _j.name) === null || _k === void 0 ? void 0 : _k.trim()) || 'Cliente',
                    phoneNumber: ((_m = (_l = dto.customer) === null || _l === void 0 ? void 0 : _l.phoneNumber) === null || _m === void 0 ? void 0 : _m.trim()) || '',
                },
                services: (dto.services || []).map((s) => {
                    var _a, _b;
                    return ({
                        id: s.id || s.serviceId || 'svc',
                        title: s.title,
                        priceInCents: (_a = s.priceInCents) !== null && _a !== void 0 ? _a : null,
                        durationInMinutes: (_b = s.durationInMinutes) !== null && _b !== void 0 ? _b : null,
                    });
                }),
            };
        });
    }, [(_a = dayQuery.data) === null || _a === void 0 ? void 0 : _a.items, selectedDate]);
    const showsDataForSelectedDate = dayQuery.data !== undefined && !dayQuery.isPlaceholderData;
    const bookings = useMemo(() => (showsDataForSelectedDate ? sortAgendaEntriesChronologically(bookingsRaw) : []), [bookingsRaw, showsDataForSelectedDate]);
    const totals = useMemo(() => {
        var _a, _b;
        const count = bookings.length;
        let durationMinutes = 0;
        let priceInCents = 0;
        for (const booking of bookings) {
            durationMinutes += Math.max(0, minutesBetween(booking.startTime, booking.endTime));
            for (const service of booking.services) {
                priceInCents += (_a = service.priceInCents) !== null && _a !== void 0 ? _a : 0;
            }
        }
        const summary = dayQuery.data && 'summary' in dayQuery.data ? dayQuery.data.summary : undefined;
        const incomplete = bookings.some(b => b.services.some(s => s.priceInCents == null));
        return { count: (_b = summary === null || summary === void 0 ? void 0 : summary.totalBookings) !== null && _b !== void 0 ? _b : count, durationMinutes, priceInCents: summary ? (summary.hasIncompleteData ? null : summary.totalRevenueInCents) : incomplete ? null : priceInCents };
    }, [bookings, dayQuery.data]);
    const isInitialLoading = dayQuery.isLoading && !dayQuery.isPlaceholderData;
    const isFetching = dayQuery.isFetching;
    const isUpdatingDate = isFetching && dayQuery.isPlaceholderData;
    const isRefreshing = isFetching && !isInitialLoading;
    const isError = dayQuery.isError;
    const isFatalError = isError && !showsDataForSelectedDate;
    const isErrorWithCachedData = isError && showsDataForSelectedDate;
    const normalizedError = useMemo(() => (dayQuery.error ? normalizeBookingsError(dayQuery.error) : null), [dayQuery.error]);
    const lastUpdatedAtLabel = showsDataForSelectedDate
        ? formatLastUpdated(dayQuery.dataUpdatedAt)
        : null;
    const isDataStale = showsDataForSelectedDate &&
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
        if (normalizedError === null || normalizedError === void 0 ? void 0 : normalizedError.isSessionExpired) {
            void signOut();
        }
    }, [normalizedError, signOut]);
    const [recoveryRequestId, setRecoveryRequestId] = useState(null);
    const [updatingBookingId, setUpdatingBookingId] = useState(null);
    const [updateError, setUpdateError] = useState(null);
    const [cancellingId, setCancellingId] = useState(null);
    const [cancelError, setCancelError] = useState(null);
    const handleUpdateBooking = useCallback(async (input) => {
        var _a;
        if (!operationalContext) {
            return { ok: false, message: 'Contexto operacional indisponível.' };
        }
        setUpdatingBookingId(input.bookingId);
        try {
            const currentItem = (_a = dayQuery.data) === null || _a === void 0 ? void 0 : _a.items.find((b) => b.id === input.bookingId);
            const expectedVersion = currentItem === null || currentItem === void 0 ? void 0 : currentItem.version;
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
        }
        catch (error) {
            if (error === null || error === void 0 ? void 0 : error.requestId)
                setRecoveryRequestId(error.requestId);
            const normalized = normalizeBookingError(error);
            setUpdateError({ bookingId: input.bookingId, message: normalized.message });
            if (normalized.statusCode === 401) {
                void signOut();
            }
            return { ok: false, message: normalized.message };
        }
        finally {
            setUpdatingBookingId(null);
        }
    }, [operationalContext, (_b = dayQuery.data) === null || _b === void 0 ? void 0 : _b.items, queryClient, selectedDate, showToast, signOut]);
    const handleCancelBooking = useCallback(async (bookingId) => {
        var _a;
        if (!operationalContext) {
            return { ok: false, message: 'Contexto operacional indisponível.' };
        }
        setCancellingId(bookingId);
        try {
            const currentItem = (_a = dayQuery.data) === null || _a === void 0 ? void 0 : _a.items.find((b) => b.id === bookingId);
            const expectedVersion = currentItem === null || currentItem === void 0 ? void 0 : currentItem.version;
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
        }
        catch (error) {
            if (error === null || error === void 0 ? void 0 : error.requestId)
                setRecoveryRequestId(error.requestId);
            const normalized = normalizeBookingError(error);
            setCancelError({ bookingId, message: normalized.message });
            if (normalized.statusCode === 401) {
                void signOut();
            }
            return { ok: false, message: normalized.message };
        }
        finally {
            setCancellingId(null);
        }
    }, [operationalContext, (_c = dayQuery.data) === null || _c === void 0 ? void 0 : _c.items, queryClient, selectedDate, showToast, signOut]);
    const clearCancelError = useCallback((bookingId) => {
        setCancelError((current) => ((current === null || current === void 0 ? void 0 : current.bookingId) === bookingId ? null : current));
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
        errorTitle: (_d = normalizedError === null || normalizedError === void 0 ? void 0 : normalizedError.title) !== null && _d !== void 0 ? _d : 'Não foi possível carregar seus atendimentos.',
        errorDescription: (_e = normalizedError === null || normalizedError === void 0 ? void 0 : normalizedError.description) !== null && _e !== void 0 ? _e : 'Tente novamente em instantes.',
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
