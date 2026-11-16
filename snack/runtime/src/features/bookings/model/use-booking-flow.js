import { PUBLIC_CATALOG_OPTIONS } from '../../../shared/cache/public-query-persister';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../auth';
import { servicesApi } from '../../services/api/services.api';
import { barbershopApi } from '../../barbershop';
import { listBarbershopProfessionals, } from '../api/bookings.api';
import { bookingQueryKeys, invalidateBookingQueries } from './booking-query-keys';
import { serverClock } from '../lib/server-clock';
import { useBookingAvailability } from './use-booking-availability';
import { bookingOperationEngine } from './booking-operation-engine';
import { operationAttemptStore } from '../../../shared/operations/operation-attempt-store';
import { normalizeBookingError } from '../lib/normalize-booking-error';
export function useBookingFlow(options) {
    var _a, _b, _c, _d, _e;
    const { mode, shopId, bookingId, initialServiceIds = [], initialDate = null, initialProfessionalId = null, initialCustomer = null, } = options;
    const queryClient = useQueryClient();
    const { identity, status: sessionStatus, memberships, selectedShopId } = useSession();
    const operationalMember = memberships.find(m => m.id === selectedShopId && m.id === shopId && m.state === 'ACTIVE');
    const ownAgendaOnly = (operationalMember === null || operationalMember === void 0 ? void 0 : operationalMember.role) === 'BARBERMAN';
    // Passos do fluxo
    const [step, setStep] = useState(initialServiceIds.length > 0 ? 'PROFESSIONAL' : 'SERVICES');
    // Seleções do carrinho
    const [selectedServiceIds, setSelectedServiceIds] = useState(Array.from(new Set(initialServiceIds)));
    const [selectedProfessionalId, setSelectedProfessionalId] = useState(initialProfessionalId);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [selectedSlot, setSelectedSlot] = useState(null);
    // Cliente operacional (modo UNIT)
    const [customer, setCustomer] = useState(initialCustomer);
    // Estados de submissão e erro
    const [status, setStatus] = useState('reviewing');
    const [errorMessage, setErrorMessage] = useState(null);
    const [quoteMismatch, setQuoteMismatch] = useState(false);
    const [authoritativeQuote, setAuthoritativeQuote] = useState(null);
    const [confirmedBooking, setConfirmedBooking] = useState(null);
    const [uncertainKey, setUncertainKey] = useState(null);
    // Ref de motor e proteção de submissão simultânea (double-tap guard)
    const isSubmittingRef = useRef(false);
    const activeEngineRef = useRef(null);
    // 1. Consulta dos serviços da barbearia
    const servicesQuery = useQuery({
        queryKey: ['services', 'public', shopId],
        ...PUBLIC_CATALOG_OPTIONS,
        queryFn: () => servicesApi.listServices(shopId, { limit: 100, includeInactive: false }),
        select: (response) => response.items,
        enabled: Boolean(shopId),
    });
    // 2. Consulta dos profissionais da barbearia
    const professionalsQuery = useQuery({
        queryKey: bookingQueryKeys.professionals(shopId),
        ...PUBLIC_CATALOG_OPTIONS,
        queryFn: async () => {
            return listBarbershopProfessionals(shopId);
        },
        enabled: Boolean(shopId),
    });
    // 3. Consulta dos dados da barbearia (fuso horário, nome)
    const barbershopQuery = useQuery({
        queryKey: ['barbershop', 'public', shopId],
        ...PUBLIC_CATALOG_OPTIONS,
        queryFn: async () => {
            return barbershopApi.getBarbershop(shopId);
        },
        enabled: Boolean(shopId),
    });
    // 4. Consulta de disponibilidade de horários
    // A data local serve apenas ao bootstrap HTTP; escolhas usam o relógio do servidor.
    const availabilityQuery = useBookingAvailability(shopId, {
        date: selectedDate || new Date().toISOString().slice(0, 10),
        serviceIds: selectedServiceIds,
        barbermanId: selectedProfessionalId || undefined,
    }, step === 'SLOT' || step === 'REVIEW');
    const { refetch: refetchAvailability } = availabilityQuery;
    useEffect(() => {
        if (!selectedSlot || isSubmittingRef.current || status === 'confirmed' || status === 'uncertain')
            return;
        const now = serverClock.now();
        const expired = now === null || Date.parse(selectedSlot.slotStartAt) <= now;
        if (!expired && availabilityQuery.isRevalidating)
            return;
        if (!availabilityQuery.slots.some(slot => slot.start === selectedSlot.slotStartAt && slot.end === selectedSlot.end)) {
            setSelectedSlot(null);
            setErrorMessage('Esse horário expirou ou não está mais disponível. Escolha outro horário.');
            if (step === 'REVIEW')
                setStep('SLOT');
        }
    }, [selectedSlot, availabilityQuery.slots, availabilityQuery.isRevalidating, step, status]);
    // Mapeamento dos serviços selecionados
    const availableServices = useMemo(() => { var _a; return (_a = servicesQuery.data) !== null && _a !== void 0 ? _a : []; }, [servicesQuery.data]);
    const selectedServices = useMemo(() => {
        return availableServices.filter((s) => selectedServiceIds.includes(s.id));
    }, [availableServices, selectedServiceIds]);
    const totalPriceInCents = useMemo(() => {
        return selectedServices.reduce((acc, s) => acc + s.priceInCents, 0);
    }, [selectedServices]);
    const totalDurationInMinutes = useMemo(() => {
        return selectedServices.reduce((acc, s) => acc + s.durationInMinutes, 0);
    }, [selectedServices]);
    const selectedProfessional = useMemo(() => {
        var _a, _b;
        return (_b = ((_a = professionalsQuery.data) !== null && _a !== void 0 ? _a : []).find((p) => p.id === selectedProfessionalId)) !== null && _b !== void 0 ? _b : null;
    }, [professionalsQuery.data, selectedProfessionalId]);
    // Se a unidade mudar, reseta todas as seleções de serviços, profissional, slot e cliente
    const prevShopIdRef = useRef(shopId);
    useEffect(() => {
        if (prevShopIdRef.current !== shopId) {
            prevShopIdRef.current = shopId;
            setSelectedServiceIds([]);
            setSelectedProfessionalId(mode === 'UNIT' && ownAgendaOnly && identity ? identity.id : null);
            setSelectedDate(null);
            setSelectedSlot(null);
            setCustomer(null);
            setConfirmedBooking(null);
            setUncertainKey(null);
            setErrorMessage(null);
            setQuoteMismatch(false);
            setAuthoritativeQuote(null);
            setStep('SERVICES');
        }
    }, [shopId, mode, ownAgendaOnly, identity]);
    // Se BARBER operando em modo UNIT, fixa o profissional para ele mesmo
    useEffect(() => {
        if (mode === 'UNIT' && ownAgendaOnly && identity) {
            setSelectedProfessionalId(identity.id);
        }
    }, [mode, identity, ownAgendaOnly]);
    // Ações de seleção com invalidação de dependências posteriores
    const toggleService = useCallback((serviceId) => {
        setSelectedServiceIds((prev) => {
            const next = prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId];
            // Mudar seleção de serviços invalida o slot selecionado e cotação divergente
            setSelectedSlot(null);
            setQuoteMismatch(false);
            setAuthoritativeQuote(null);
            return next;
        });
    }, []);
    const selectProfessional = useCallback((professionalId) => {
        setSelectedProfessionalId((prev) => {
            if (prev !== professionalId) {
                setSelectedSlot(null);
            }
            return professionalId;
        });
    }, []);
    const selectDate = useCallback((date) => {
        setSelectedDate((prev) => {
            if (prev !== date) {
                setSelectedSlot(null);
            }
            return date;
        });
    }, []);
    const selectSlot = useCallback((slot) => {
        if (!availabilityQuery.slots.some(item => item.start === slot.slotStartAt && item.end === slot.end))
            return;
        setSelectedSlot(slot);
        setQuoteMismatch(false);
        setErrorMessage(null);
    }, [availabilityQuery.slots]);
    // Navegação entre passos
    const goToStep = useCallback((nextStep) => {
        setStep(nextStep);
        setErrorMessage(null);
    }, []);
    // Submissão do agendamento
    const submitBooking = useCallback(async () => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (mode === 'UNIT' && (!operationalMember || !['OWNER', 'BARBERMAN'].includes(operationalMember.role) || (ownAgendaOnly && selectedProfessionalId !== (identity === null || identity === void 0 ? void 0 : identity.id)))) {
            setErrorMessage('Vínculo ou profissional incompatível com a unidade selecionada.');
            return;
        }
        if (isSubmittingRef.current)
            return;
        if (selectedServices.length === 0) {
            setErrorMessage('Selecione ao menos um serviço.');
            return;
        }
        if (!selectedProfessionalId) {
            setErrorMessage('Selecione um profissional.');
            return;
        }
        if (!selectedDate || !selectedSlot) {
            setErrorMessage('Selecione data e horário para o atendimento.');
            return;
        }
        if (mode === 'UNIT' && !customer) {
            setErrorMessage('Selecione o cliente atendido nesta unidade.');
            return;
        }
        if (uncertainKey) {
            setStep('UNCERTAIN');
            return;
        }
        if (!(identity === null || identity === void 0 ? void 0 : identity.id)) {
            setErrorMessage('Entre para confirmar o agendamento.');
            return;
        }
        isSubmittingRef.current = true;
        setStatus('submitting');
        setErrorMessage(null);
        try {
            const fresh = await refetchAvailability();
            const now = serverClock.now();
            if (fresh.isError || now === null) {
                setStatus('error');
                setErrorMessage('Não foi possível atualizar os horários. Verifique a conexão e tente novamente.');
                return;
            }
            if (!((_a = fresh.data) === null || _a === void 0 ? void 0 : _a.slots.some(slot => slot.start === selectedSlot.slotStartAt && slot.end === selectedSlot.end && Date.parse(slot.start) > now))) {
                setSelectedSlot(null);
                setStep('SLOT');
                setStatus('error');
                setErrorMessage('Esse horário expirou ou foi reservado. Escolha outro horário.');
                return;
            }
            // Exige referência autoritativa sincronizada pelo servidor via HTTP
            if (!serverClock.hasValidReference()) {
                setStatus('error');
                setErrorMessage('Aguardando sincronização de horário com o servidor. Verifique a conexão antes de confirmar.');
                isSubmittingRef.current = false;
                return;
            }
            if (bookingId && !((_b = options.initialBooking) === null || _b === void 0 ? void 0 : _b.version))
                throw new Error('Atualize a reserva antes de remarcar.');
            let result;
            const isRescheduling = Boolean(bookingId || options.flowMode === 'RESCHEDULE');
            if (isRescheduling) {
                if (!bookingId) {
                    throw new Error('bookingId é obrigatório para remarcação.');
                }
                const prepared = await bookingOperationEngine.prepare({
                    action: 'RESCHEDULE',
                    actorId: identity.id,
                    scope: mode,
                    bookingId,
                    expectedVersion: (_c = options.initialBooking) === null || _c === void 0 ? void 0 : _c.version,
                    date: selectedDate,
                    startTime: selectedSlot.startTime,
                    slotStartAt: selectedSlot.slotStartAt,
                    barbermanId: selectedProfessionalId !== null && selectedProfessionalId !== void 0 ? selectedProfessionalId : undefined,
                    serviceIds: selectedServiceIds,
                    expectedTotalPriceInCents: totalPriceInCents,
                    expectedDurationInMinutes: totalDurationInMinutes,
                });
                const opResult = await bookingOperationEngine.submit(prepared);
                if (opResult.state === 'APPLIED' && ((_e = (_d = opResult.resource) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.booking)) {
                    result = opResult.resource.data.booking;
                }
                else {
                    throw new Error('Remarcação não foi confirmada pelo servidor.');
                }
            }
            else {
                const prepared = await bookingOperationEngine.prepare({
                    action: 'CREATE',
                    actorId: identity.id,
                    scope: mode,
                    shopId,
                    customerId: customer === null || customer === void 0 ? void 0 : customer.id,
                    serviceIds: selectedServiceIds,
                    barbermanId: selectedProfessionalId,
                    date: selectedDate,
                    startTime: selectedSlot.startTime,
                    slotStartAt: selectedSlot.slotStartAt,
                    expectedTotalPriceInCents: totalPriceInCents,
                    expectedDurationInMinutes: totalDurationInMinutes,
                });
                const opResult = await bookingOperationEngine.submit(prepared);
                if (opResult.state === 'APPLIED' && ((_g = (_f = opResult.resource) === null || _f === void 0 ? void 0 : _f.data) === null || _g === void 0 ? void 0 : _g.booking)) {
                    result = opResult.resource.data.booking;
                }
                else {
                    throw new Error('Agendamento não foi confirmado pelo servidor.');
                }
            }
            setConfirmedBooking(result);
            setStatus('confirmed');
            setStep('RESULT');
            // Invalidação granular de cache após confirmação
            const oldDate = options.initialBooking ? String(options.initialBooking.date).split('T')[0] : '';
            await invalidateBookingQueries(queryClient, {
                actorId: identity === null || identity === void 0 ? void 0 : identity.id,
                shopId,
                bookingId: result.id,
                oldProfessionalId: (_h = options.initialBooking) === null || _h === void 0 ? void 0 : _h.barbermanId,
                newProfessionalId: selectedProfessionalId,
                dates: [selectedDate, oldDate].filter(Boolean),
            });
        }
        catch (err) {
            const normalized = normalizeBookingError(err);
            if (normalized.code === 'SLOT_UNAVAILABLE') {
                setSelectedSlot(null);
                setStatus('error');
                setStep('SLOT');
                setErrorMessage(normalized.message || 'Esse horário não está mais disponível. Escolha outro.');
                void refetchAvailability();
            }
            else if (normalized.code === 'QUOTE_CHANGED') {
                setStatus('error');
                setQuoteMismatch(true);
                setAuthoritativeQuote((_j = normalized.quote) !== null && _j !== void 0 ? _j : null);
                setErrorMessage(normalized.message ||
                    'Os valores ou durações foram alterados. Revise o novo orçamento antes de confirmar.');
                // Retorna à revisão para reconfirmação explícita do usuário
                setStep('REVIEW');
            }
            else if (err.requestId) {
                setUncertainKey(err.requestId);
                setStatus('uncertain');
                setStep('UNCERTAIN');
                setErrorMessage(err.message);
            }
            else if (normalized.code === 'NETWORK_OR_TIMEOUT' ||
                normalized.isNetworkError ||
                !(err === null || err === void 0 ? void 0 : err.status)) {
                setStatus('uncertain');
                setUncertainKey(null);
                setErrorMessage(normalized.message);
                setStep('UNCERTAIN');
            }
            else {
                setStatus('error');
                setErrorMessage(normalized.message || 'Falha ao concluir agendamento. Verifique as informações.');
            }
        }
        finally {
            isSubmittingRef.current = false;
        }
    }, [
        mode,
        shopId,
        bookingId,
        uncertainKey,
        operationalMember,
        ownAgendaOnly,
        customer,
        selectedServices,
        selectedServiceIds,
        selectedProfessionalId,
        selectedDate,
        selectedSlot,
        totalPriceInCents,
        totalDurationInMinutes,
        identity,
        queryClient,
        refetchAvailability,
        options.flowMode,
        options.initialBooking,
    ]);
    // Reconciliação / ação de fechar tentativa incerta
    const resolveUncertainAttempt = useCallback(async () => {
        if (!uncertainKey || !(identity === null || identity === void 0 ? void 0 : identity.id))
            return;
        try {
            await operationAttemptStore.clearResolved(identity.id);
            setUncertainKey(null);
            setStatus('reviewing');
            setStep('REVIEW');
        }
        catch {
            // Ignora erro
        }
    }, [uncertainKey, identity]);
    const resetFlow = useCallback(() => {
        setSelectedServiceIds([]);
        setSelectedProfessionalId(mode === 'UNIT' && ownAgendaOnly && identity ? identity.id : null);
        setSelectedDate(null);
        setSelectedSlot(null);
        setCustomer(null);
        setConfirmedBooking(null);
        setStatus('reviewing');
        setErrorMessage(null);
        setQuoteMismatch(false);
        setAuthoritativeQuote(null);
        setUncertainKey(null);
        setStep('SERVICES');
    }, [mode, ownAgendaOnly, identity]);
    return {
        mode,
        step,
        shopId,
        barbershop: barbershopQuery.data,
        services: availableServices,
        professionals: mode === 'UNIT' && ownAgendaOnly ? ((_a = professionalsQuery.data) !== null && _a !== void 0 ? _a : []).filter(p => p.id === (identity === null || identity === void 0 ? void 0 : identity.id)) : (_b = professionalsQuery.data) !== null && _b !== void 0 ? _b : [],
        availabilitySlots: availabilityQuery.slots,
        serverNow: availabilityQuery.serverNow,
        selectedServiceIds,
        selectedServices,
        selectedProfessionalId,
        selectedProfessional,
        selectedDate,
        selectedSlot,
        customer,
        totalPriceInCents,
        totalDurationInMinutes,
        status,
        errorMessage,
        quoteMismatch,
        authoritativeQuote,
        confirmedBooking,
        uncertainKey,
        isLoading: servicesQuery.isLoading ||
            professionalsQuery.isLoading ||
            barbershopQuery.isLoading,
        isAvailabilityLoading: availabilityQuery.isLoading,
        servicesError: servicesQuery.error ? (((_c = servicesQuery.error) === null || _c === void 0 ? void 0 : _c.message) || 'Falha ao carregar serviços.') : null,
        professionalsError: professionalsQuery.error ? (((_d = professionalsQuery.error) === null || _d === void 0 ? void 0 : _d.message) || 'Falha ao carregar profissionais.') : null,
        availabilityError: availabilityQuery.error ? (((_e = availabilityQuery.error) === null || _e === void 0 ? void 0 : _e.message) || 'Falha ao carregar horários disponíveis.') : null,
        refetchServices: servicesQuery.refetch,
        refetchProfessionals: professionalsQuery.refetch,
        refetchAvailability: availabilityQuery.refetch,
        toggleService,
        selectProfessional,
        selectDate,
        selectSlot,
        setCustomer,
        goToStep,
        submitBooking,
        resolveUncertainAttempt,
        resetFlow,
    };
}
