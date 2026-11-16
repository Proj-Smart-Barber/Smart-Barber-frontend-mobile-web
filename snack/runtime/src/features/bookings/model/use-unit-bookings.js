import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUnitBookings } from '../api/bookings.api';
import { serverClock } from '../lib/server-clock';
import { bookingQueryKeys } from './booking-query-keys';
import { getCivilDateInTimezone, getCivilTimeInTimezone, toISODate, } from '../../../shared/lib/civil-time';
const DEFAULT_PAGE_LIMIT = 20;
const readRevisions = new WeakMap();
function readRevision(client, key) { var _a, _b; return (_b = (_a = readRevisions.get(client)) === null || _a === void 0 ? void 0 : _a.get(key)) !== null && _b !== void 0 ? _b : 0; }
function beginRead(client, key) {
    var _a;
    let revisions = readRevisions.get(client);
    if (!revisions) {
        revisions = new Map();
        readRevisions.set(client, revisions);
    }
    const revision = ((_a = revisions.get(key)) !== null && _a !== void 0 ? _a : 0) + 1;
    revisions.set(key, revision);
    return revision;
}
export function useUnitBookings(context, initialFilter) {
    var _a;
    const queryClient = useQueryClient();
    // Autorização estrita
    const isAuthorized = Boolean(context &&
        context.userId &&
        context.shopId &&
        (context.role === 'OWNER' || context.role === 'BARBERMAN'));
    const isUnitActive = isAuthorized && (context === null || context === void 0 ? void 0 : context.unitStatus) === 'ACTIVE';
    const role = context === null || context === void 0 ? void 0 : context.role;
    const shopId = context === null || context === void 0 ? void 0 : context.shopId;
    const userId = context === null || context === void 0 ? void 0 : context.userId;
    const timezone = (context === null || context === void 0 ? void 0 : context.timezone) || 'America/Sao_Paulo';
    // Filtro de profissional: BARBERMAN consulta estritamente a si próprio; OWNER pode filtrar
    const [ownerFilteredBarbermanId, setOwnerFilteredBarbermanId] = useState(role === 'OWNER' ? initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.barbermanId : undefined);
    const effectiveBarbermanId = useMemo(() => {
        if (!isAuthorized)
            return undefined;
        if (role === 'BARBERMAN')
            return userId;
        return ownerFilteredBarbermanId;
    }, [isAuthorized, role, userId, ownerFilteredBarbermanId]);
    // Status do relógio e última sincronização aceita
    const [clockTick, setClockTick] = useState(0);
    const [clockStatus, setClockStatus] = useState(() => {
        if (!isAuthorized)
            return 'error';
        return serverClock.hasValidReference() ? 'valid' : 'syncing';
    });
    const [lastAcceptedSyncAtMs, setLastAcceptedSyncAtMs] = useState(() => serverClock.hasValidReference() ? Date.now() : null);
    // 1. BOOTSTRAP TEMPORAL AUTORIZADO:
    // Executa GET /barbershops/:shopId/bookings?limit=1&bootstrapOnly=true&includeSummary=false (sem date)
    // apenas quando o relógio autoritativo ainda não possui referência válida.
    const needsClockBootstrap = !serverClock.hasValidReference();
    const bootstrapQuery = useQuery({
        queryKey: isAuthorized && shopId
            ? bookingQueryKeys.unitBookingsBootstrap(shopId, userId, role, role === 'BARBERMAN' ? userId : undefined)
            : ['disabled-bootstrap'],
        queryFn: async ({ signal }) => {
            if (!shopId)
                throw new Error('Unidade não informada');
            const sampleMonotonicMs = performance.now();
            const expectedClockGen = serverClock.getGeneration();
            const currentGen = generationRef.current;
            const res = await fetchUnitBookings(shopId, {
                limit: 1,
                bootstrapOnly: true,
                includeSummary: false,
                barbermanId: role === 'BARBERMAN' ? userId : undefined,
            }, { skipAutoSyncClock: true, signal });
            if (generationRef.current !== currentGen || serverClock.getGeneration() !== expectedClockGen) {
                return res;
            }
            if (res.serverTime && Number.isFinite(Date.parse(res.serverTime))) {
                const synced = serverClock.syncWithServer(res.serverTime, {
                    sampleMonotonicMs,
                    expectedGeneration: expectedClockGen,
                });
                if (synced) {
                    setClockStatus('valid');
                    setLastAcceptedSyncAtMs(Date.now());
                }
            }
            return res;
        },
        enabled: isAuthorized && Boolean(shopId) && needsClockBootstrap,
        staleTime: 60000,
    });
    // Atualiza estado do relógio em caso de erro no bootstrap
    useEffect(() => {
        if (bootstrapQuery.isError && !serverClock.hasValidReference()) {
            setClockStatus('error');
        }
    }, [bootstrapQuery.isError]);
    // Data de hoje autoritativa na unidade
    const unitTodayDate = useMemo(() => {
        if (!serverClock.hasValidReference())
            return null;
        try {
            const nowMs = serverClock.getRequiredNow();
            return getCivilDateInTimezone(nowMs, timezone);
        }
        catch {
            return null;
        }
    }, [clockTick, clockStatus, timezone, (_a = bootstrapQuery.data) === null || _a === void 0 ? void 0 : _a.serverTime]);
    // Data selecionada (inicia com filtro inicial ou hoje da unidade ou fallback vazio)
    const followingTodayRef = useRef(!(initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.date));
    const [selectedDate, setSelectedDate] = useState(() => {
        if (initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.date)
            return initialFilter.date;
        if (serverClock.hasValidReference()) {
            try {
                return getCivilDateInTimezone(serverClock.getRequiredNow(), timezone);
            }
            catch {
                return toISODate(new Date());
            }
        }
        return '';
    });
    // Quando o bootstrap sincroniza e não havia data selecionada, alinha com hoje
    useEffect(() => {
        if (unitTodayDate && !selectedDate) {
            setSelectedDate(unitTodayDate);
        }
    }, [unitTodayDate, selectedDate]);
    // Geração da consulta para evitar condições de corrida entre requisições
    const [generation, setGeneration] = useState(0);
    const generationRef = useRef(0);
    // Paginação acumulada
    const [currentPage, setCurrentPage] = useState(1);
    const [accumulatedPages, setAccumulatedPages] = useState(new Map());
    const [hasNext, setHasNext] = useState(false);
    const [totalCount, setTotalCount] = useState(null);
    const [summaryData, setSummaryData] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    // Reinicia estado de paginação e incrementa geração quando filtros mudam
    const currentFilterKey = `${userId}-${shopId}-${role}-${effectiveBarbermanId}-${selectedDate}-${initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.status}`;
    const prevFilterKeyRef = useRef(currentFilterKey);
    const belongsToCurrentFilter = prevFilterKeyRef.current === currentFilterKey;
    useEffect(() => {
        if (prevFilterKeyRef.current !== currentFilterKey) {
            prevFilterKeyRef.current = currentFilterKey;
            generationRef.current += 1;
            setGeneration(generationRef.current);
            setCurrentPage(1);
            setAccumulatedPages(new Map());
            setHasNext(false);
            setTotalCount(null);
            setSummaryData(null);
        }
    }, [currentFilterKey]);
    const latestFilterRef = useRef(currentFilterKey);
    latestFilterRef.current = currentFilterKey;
    // 2. CONSULTA DA PÁGINA 1
    const page1Query = useQuery({
        queryKey: isAuthorized && shopId && selectedDate
            ? bookingQueryKeys.unitBookings(shopId, {
                date: selectedDate,
                barbermanId: effectiveBarbermanId,
                status: initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.status,
                page: 1,
                limit: DEFAULT_PAGE_LIMIT,
            }, userId, role)
            : ['disabled-unit-bookings'],
        queryFn: async ({ signal }) => {
            if (!shopId)
                throw new Error('Unidade não informada');
            const requestFilter = currentFilterKey;
            const requestGeneration = beginRead(queryClient, requestFilter);
            const sampleMonotonicMs = performance.now();
            const expectedClockGen = serverClock.getGeneration();
            const currentGen = generationRef.current;
            const res = await fetchUnitBookings(shopId, {
                date: selectedDate,
                barbermanId: effectiveBarbermanId,
                status: initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.status,
                page: 1,
                limit: DEFAULT_PAGE_LIMIT,
            }, { skipAutoSyncClock: true, signal });
            // Cache belongs to the query, not to the observer that started its fetch.
            if (readRevision(queryClient, requestFilter) !== requestGeneration)
                throw new Error('Consulta substituída por uma leitura mais recente.');
            if (latestFilterRef.current === requestFilter && serverClock.getGeneration() === expectedClockGen && res.serverTime && Number.isFinite(Date.parse(res.serverTime))) {
                if (serverClock.syncWithServer(res.serverTime, { sampleMonotonicMs, expectedGeneration: expectedClockGen })) {
                    setLastAcceptedSyncAtMs(Date.now());
                    setClockStatus('valid');
                }
            }
            return { ...res, requestGeneration, requestFilter };
        },
        enabled: isAuthorized && Boolean(shopId) && Boolean(selectedDate),
        placeholderData: (prev) => prev,
        refetchInterval: () => {
            if (AppState.currentState && AppState.currentState !== 'active')
                return false;
            if (typeof document !== 'undefined' && document.hidden)
                return false;
            if (typeof navigator !== 'undefined' && navigator.onLine === false)
                return false;
            return 60000;
        },
        refetchIntervalInBackground: false,
    });
    // Atualiza páginas acumuladas com a página 1 da geração corrente.
    // Reinicia conjunto acumulado estritamente com a página 1, descartando páginas 2+
    // órfãs de snapshots anteriores quando a página 1 é atualizada por refetch/polling.
    useEffect(() => {
        if (page1Query.data && !page1Query.isPlaceholderData) {
            const data = page1Query.data;
            if (data.requestGeneration !== readRevision(queryClient, data.requestFilter) || data.requestFilter !== latestFilterRef.current)
                return;
            setGeneration(data.requestGeneration);
            const items = Array.isArray(data.items) ? data.items : [];
            setAccumulatedPages(new Map([[1, items]]));
            setCurrentPage(1);
            setIsLoadingMore(false);
            setHasNext(Boolean(data.hasNext));
            setTotalCount(typeof data.total === 'number' ? data.total : null);
            if (data.summary) {
                setSummaryData({
                    totalBookings: data.summary.totalBookings,
                    totalRevenueInCents: data.summary.totalRevenueInCents,
                    hasIncompleteData: data.summary.hasIncompleteData,
                });
            }
            else {
                setSummaryData(null);
            }
        }
    }, [page1Query.data, page1Query.isPlaceholderData]);
    // Ação de carregar mais páginas com tratamento de erro exposto
    const [loadMoreError, setLoadMoreError] = useState(null);
    const loadMore = useCallback(async () => {
        if (!belongsToCurrentFilter || !isAuthorized || !shopId || !selectedDate || !hasNext || isLoadingMore || page1Query.isFetching) {
            return;
        }
        const nextPage = currentPage + 1;
        const pageRevision = readRevision(queryClient, currentFilterKey);
        const currentGen = generationRef.current;
        setIsLoadingMore(true);
        setLoadMoreError(null);
        try {
            const res = await fetchUnitBookings(shopId, {
                date: selectedDate,
                barbermanId: effectiveBarbermanId,
                status: initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.status,
                page: nextPage,
                limit: DEFAULT_PAGE_LIMIT,
                includeSummary: false,
            }, { skipAutoSyncClock: true });
            // Descarta se a geração mudou enquanto a requisição estava em trânsito
            if (generationRef.current !== currentGen || readRevision(queryClient, currentFilterKey) !== pageRevision) {
                return;
            }
            const newItems = Array.isArray(res.items) ? res.items : [];
            setAccumulatedPages((prev) => {
                const nextMap = new Map(prev);
                nextMap.set(nextPage, newItems);
                return nextMap;
            });
            setCurrentPage(nextPage);
            setHasNext(Boolean(res.hasNext));
            if (typeof res.total === 'number' && res.summary) {
                setTotalCount(res.total);
            }
        }
        catch (err) {
            if (generationRef.current !== currentGen || readRevision(queryClient, currentFilterKey) !== pageRevision)
                return;
            setLoadMoreError((err === null || err === void 0 ? void 0 : err.message) || 'Falha ao carregar páginas adicionais.');
        }
        finally {
            if (generationRef.current === currentGen && readRevision(queryClient, currentFilterKey) === pageRevision)
                setIsLoadingMore(false);
        }
    }, [
        belongsToCurrentFilter,
        isAuthorized,
        shopId,
        selectedDate,
        hasNext,
        isLoadingMore,
        page1Query.isFetching,
        currentPage,
        queryClient,
        currentFilterKey,
        effectiveBarbermanId,
        initialFilter === null || initialFilter === void 0 ? void 0 : initialFilter.status,
    ]);
    // Ação de refetch completo
    const refetch = useCallback(async () => {
        generationRef.current += 1;
        setGeneration(generationRef.current);
        setCurrentPage(1);
        setAccumulatedPages(new Map());
        await Promise.all([bootstrapQuery.refetch(), page1Query.refetch()]);
    }, [bootstrapQuery, page1Query]);
    // Deduplicação e ordenação cronológica de todos os itens carregados
    const items = useMemo(() => {
        if (!belongsToCurrentFilter)
            return [];
        const itemMap = new Map();
        // Percorre as páginas em ordem
        const sortedPages = Array.from(accumulatedPages.keys()).sort((a, b) => a - b);
        for (const pageNum of sortedPages) {
            const pageItems = accumulatedPages.get(pageNum) || [];
            for (const item of pageItems) {
                if ((item === null || item === void 0 ? void 0 : item.id) && !itemMap.has(item.id)) {
                    itemMap.set(item.id, item);
                }
            }
        }
        const list = Array.from(itemMap.values());
        list.sort((a, b) => {
            const timeA = a.startTime || (a.startsAt ? a.startsAt.slice(11, 16) : '00:00');
            const timeB = b.startTime || (b.startsAt ? b.startsAt.slice(11, 16) : '00:00');
            return timeA.localeCompare(timeB);
        });
        return list;
    }, [accumulatedPages, belongsToCurrentFilter]);
    // isPartial é verdadeiro se o servidor tem mais páginas que ainda não carregamos
    // ou se o conjunto carregado for menor que o total indicado pelo servidor
    const isPartial = Boolean(hasNext || (totalCount !== null && items.length < totalCount));
    // Monitora expiração de lease (5 min) e virada de dia civil da unidade
    const prevCivilTodayRef = useRef(unitTodayDate);
    useEffect(() => {
        if (!prevCivilTodayRef.current && unitTodayDate)
            prevCivilTodayRef.current = unitTodayDate;
    }, [unitTodayDate]);
    const [isSlowSync, setIsSlowSync] = useState(false);
    useEffect(() => {
        const timer = setInterval(() => {
            setClockTick(tick => tick + 1);
            // 1. Monitora lease do relógio
            if (!serverClock.hasValidReference()) {
                setClockStatus((prev) => (prev === 'valid' ? 'expired' : prev));
            }
            // 2. Monitora virada do dia civil da unidade
            if (serverClock.hasValidReference()) {
                try {
                    const nowMs = serverClock.getRequiredNow();
                    const currentCivilToday = getCivilDateInTimezone(nowMs, timezone);
                    if (prevCivilTodayRef.current && currentCivilToday !== prevCivilTodayRef.current) {
                        // Se o usuário estava visualizando o dia de hoje anterior, avança automaticamente
                        const previousToday = prevCivilTodayRef.current;
                        setSelectedDate((prevDate) => {
                            if (followingTodayRef.current && prevDate === previousToday) {
                                return currentCivilToday;
                            }
                            return prevDate;
                        });
                    }
                    prevCivilTodayRef.current = currentCivilToday;
                }
                catch {
                    // Relógio não sincronizado
                }
            }
        }, 2000);
        return () => clearInterval(timer);
    }, [timezone]);
    // Monitora lentidão de resposta (> 5s)
    useEffect(() => {
        let slowTimer = null;
        if (page1Query.isFetching || bootstrapQuery.isFetching) {
            slowTimer = setTimeout(() => {
                setIsSlowSync(true);
            }, 5000);
        }
        else {
            setIsSlowSync(false);
        }
        return () => {
            if (slowTimer)
                clearTimeout(slowTimer);
        };
    }, [page1Query.isFetching, bootstrapQuery.isFetching]);
    const isDataStale = clockStatus === 'expired' ||
        (lastAcceptedSyncAtMs !== null && Date.now() - lastAcceptedSyncAtMs > 5 * 60 * 1000);
    // Próximo agendamento ativo na data selecionada
    const { nextAppointment, isNextAppointmentIndeterminate } = useMemo(() => {
        var _a, _b;
        if (!unitTodayDate || selectedDate !== unitTodayDate || !serverClock.hasValidReference()) {
            return { nextAppointment: null, isNextAppointmentIndeterminate: false };
        }
        const nowMs = serverClock.now();
        if (nowMs === null) {
            return { nextAppointment: null, isNextAppointmentIndeterminate: true };
        }
        const currentCivilTime = getCivilTimeInTimezone(nowMs, timezone);
        const activeItems = items.filter((b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED' && b.status !== 'NO_SHOW');
        const upcoming = activeItems.find((b) => {
            const t = b.startTime || (b.startsAt ? b.startsAt.slice(11, 16) : '00:00');
            return t >= currentCivilTime;
        });
        if (upcoming) {
            const services = Array.isArray(upcoming.services) ? upcoming.services : [];
            const serviceTitle = services.map((s) => s.title).filter(Boolean).join(', ') || 'Atendimento';
            const customerName = ((_b = (_a = upcoming.customer) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.trim()) || 'Cliente';
            const startTime = upcoming.startTime || (upcoming.startsAt ? upcoming.startsAt.slice(11, 16) : '00:00');
            return {
                nextAppointment: {
                    id: upcoming.id,
                    startTime,
                    customerName,
                    serviceTitle,
                    professionalName: upcoming.barbermanName || undefined,
                },
                isNextAppointmentIndeterminate: false,
            };
        }
        // Se nenhum futuro foi encontrado nos itens carregados, mas hasNext é true,
        // não podemos declarar "nenhum próximo" com precisão inventada
        if (isPartial) {
            return { nextAppointment: null, isNextAppointmentIndeterminate: true };
        }
        return { nextAppointment: null, isNextAppointmentIndeterminate: false };
    }, [unitTodayDate, selectedDate, timezone, items, isPartial]);
    const selectDateExplicitly = useCallback((date) => { followingTodayRef.current = false; setSelectedDate(date); }, []);
    const followToday = useCallback(() => { followingTodayRef.current = true; if (serverClock.hasValidReference())
        setSelectedDate(getCivilDateInTimezone(serverClock.getRequiredNow(), timezone)); }, [timezone]);
    const nextAppointmentState = isNextAppointmentIndeterminate
        ? 'indeterminate'
        : nextAppointment
            ? 'found'
            : 'none';
    return {
        context,
        isAuthorized,
        isUnitActive,
        items,
        page: currentPage,
        limit: DEFAULT_PAGE_LIMIT,
        total: isAuthorized ? (belongsToCurrentFilter ? totalCount : null) : 0,
        hasNext: belongsToCurrentFilter && hasNext,
        hasNextPage: belongsToCurrentFilter && hasNext,
        isPartial,
        summary: belongsToCurrentFilter ? summaryData : null,
        clockStatus,
        unitTodayDate,
        selectedDate: selectedDate || unitTodayDate || '',
        today: unitTodayDate || selectedDate || '',
        nextAppointment,
        isNextAppointmentIndeterminate,
        nextAppointmentState,
        effectiveBarbermanId,
        selectedBarbermanId: effectiveBarbermanId,
        selectedProfessionalId: effectiveBarbermanId,
        generation,
        isLoading: !belongsToCurrentFilter || (page1Query.isLoading && !page1Query.isPlaceholderData),
        isFetching: page1Query.isFetching || bootstrapQuery.isFetching,
        isRefreshing: (page1Query.isFetching || bootstrapQuery.isFetching) && !(page1Query.isLoading && !page1Query.isPlaceholderData),
        isLoadingMore,
        loadMoreError,
        isError: page1Query.isError || bootstrapQuery.isError,
        error: page1Query.error || bootstrapQuery.error || null,
        lastAcceptedSyncAtMs,
        isDataStale,
        isSlowSync,
        loadMore,
        refetch,
        setSelectedDate: selectDateExplicitly,
        followToday,
        setBarbermanId: setOwnerFilteredBarbermanId,
        filterByProfessional: setOwnerFilteredBarbermanId,
    };
}
