import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { servicesApi } from '@/features/services/api/services.api';
import { barbershopApi } from '@/features/barbershop';
import {
  listBarbershopProfessionals,
  getBookingAvailability,
  createBooking,
  createOperationalBooking,
  rescheduleBooking,
} from '../api/bookings.api';
import { bookingQueryKeys, invalidateBookingQueries } from './booking-query-keys';
import type {
  UseBookingFlowOptions,
  BookingFlowStep,
  SelectedSlot,
  BookingCustomer,
  BookingSubmissionStatus,
} from './booking-flow.types';
import { BookingFlowEngine } from './booking-draft';
import { serverClock } from '../lib/server-clock';
import { bookingOperationEngine } from './booking-operation-engine';
import { operationAttemptStore } from '@/shared/operations/operation-attempt-store';
import type { BookingDto, ProfessionalDto } from '../api/bookings.dto';
import type { Service } from '@/features/services/model/service.types';
import { normalizeBookingError, type AuthoritativeQuote } from '../lib/normalize-booking-error';

export function useBookingFlow(options: UseBookingFlowOptions) {
  const {
    mode,
    shopId,
    bookingId,
    initialServiceIds = [],
    initialDate = null,
    initialProfessionalId = null,
    initialCustomer = null,
  } = options;

  const queryClient = useQueryClient();
  const { identity, status: sessionStatus, memberships, selectedShopId } = useSession();
  const operationalMember = memberships.find(m => m.id === selectedShopId && m.id === shopId && m.state === 'ACTIVE');
  const ownAgendaOnly = operationalMember?.role === 'BARBERMAN';

  // Passos do fluxo
  const [step, setStep] = useState<BookingFlowStep>(
    initialServiceIds.length > 0 ? 'PROFESSIONAL' : 'SERVICES'
  );

  // Seleções do carrinho
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    Array.from(new Set(initialServiceIds))
  );
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(
    initialProfessionalId
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  // Cliente operacional (modo UNIT)
  const [customer, setCustomer] = useState<BookingCustomer | null>(initialCustomer);

  // Estados de submissão e erro
  const [status, setStatus] = useState<BookingSubmissionStatus>('reviewing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quoteMismatch, setQuoteMismatch] = useState<boolean>(false);
  const [authoritativeQuote, setAuthoritativeQuote] = useState<AuthoritativeQuote | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDto | null>(null);
  const [uncertainKey, setUncertainKey] = useState<string | null>(null);

  // Ref de motor e proteção de submissão simultânea (double-tap guard)
  const isSubmittingRef = useRef<boolean>(false);
  const activeEngineRef = useRef<BookingFlowEngine | null>(null);

  // 1. Consulta dos serviços da barbearia
  const servicesQuery = useQuery({
    queryKey: ['services', 'public', shopId],
    queryFn: () => servicesApi.listServices(shopId, { limit: 100, includeInactive: false }),
    select: (response) => response.items,
    enabled: Boolean(shopId),
  });

  // 2. Consulta dos profissionais da barbearia
  const professionalsQuery = useQuery({
    queryKey: bookingQueryKeys.professionals(shopId),
    queryFn: async () => {
      return listBarbershopProfessionals(shopId);
    },
    enabled: Boolean(shopId),
  });

  // 3. Consulta dos dados da barbearia (fuso horário, nome)
  const barbershopQuery = useQuery({
    queryKey: ['barbershop', 'public', shopId],
    queryFn: async () => {
      return barbershopApi.getBarbershop(shopId);
    },
    enabled: Boolean(shopId),
  });

  // 4. Consulta de disponibilidade de horários
  const availabilityQuery = useQuery({
    queryKey: bookingQueryKeys.availability(shopId, {
      date: selectedDate || '',
      serviceIds: selectedServiceIds,
      barbermanId: selectedProfessionalId || undefined,
    }),
    queryFn: async () => {
      if (!selectedDate || selectedServiceIds.length === 0 || !selectedProfessionalId) {
        return { slots: [] };
      }
      const res = await getBookingAvailability(shopId, {
        date: selectedDate,
        serviceIds: selectedServiceIds,
        barbermanId: selectedProfessionalId,
      });

      // Sincroniza o relógio autoritativo se serverTime estiver presente
      if (res.serverTime) {
        try {
          serverClock.syncWithServer(res.serverTime);
        } catch {
          // Mantém relógio anterior se houver
        }
      }

      return res;
    },
    enabled: Boolean(shopId && selectedDate && selectedServiceIds.length > 0 && selectedProfessionalId),
  });

  // Mapeamento dos serviços selecionados
  const availableServices = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
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
    return (professionalsQuery.data ?? []).find((p) => p.id === selectedProfessionalId) ?? null;
  }, [professionalsQuery.data, selectedProfessionalId]);

  // Se a unidade mudar, reseta todas as seleções de serviços, profissional, slot e cliente
  const prevShopIdRef = useRef<string>(shopId);
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
  const toggleService = useCallback((serviceId: string) => {
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

  const selectProfessional = useCallback((professionalId: string) => {
    setSelectedProfessionalId((prev) => {
      if (prev !== professionalId) {
        setSelectedSlot(null);
      }
      return professionalId;
    });
  }, []);

  const selectDate = useCallback((date: string) => {
    setSelectedDate((prev) => {
      if (prev !== date) {
        setSelectedSlot(null);
      }
      return date;
    });
  }, []);

  const selectSlot = useCallback((slot: SelectedSlot) => {
    setSelectedSlot(slot);
    setQuoteMismatch(false);
  }, []);

  // Navegação entre passos
  const goToStep = useCallback((nextStep: BookingFlowStep) => {
    setStep(nextStep);
    setErrorMessage(null);
  }, []);

  // Submissão do agendamento
  const submitBooking = useCallback(async () => {
    if (mode === 'UNIT' && (!operationalMember || !['OWNER', 'BARBERMAN'].includes(operationalMember.role) || (ownAgendaOnly && selectedProfessionalId !== identity?.id))) {
      setErrorMessage('Vínculo ou profissional incompatível com a unidade selecionada.'); return;
    }
    if (isSubmittingRef.current) return;
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

    if (uncertainKey) { setStep('UNCERTAIN'); return; }
    if (!identity?.id) { setErrorMessage('Entre para confirmar o agendamento.'); return; }
    isSubmittingRef.current = true;
    setStatus('submitting');
    setErrorMessage(null);

    try {
      // Exige referência autoritativa sincronizada pelo servidor via HTTP
      if (!serverClock.hasValidReference()) {
        setStatus('error');
        setErrorMessage(
          'Aguardando sincronização de horário com o servidor. Verifique a conexão antes de confirmar.'
        );
        isSubmittingRef.current = false;
        return;
      }

      if (bookingId && !options.initialBooking?.version) throw new Error('Atualize a reserva antes de remarcar.');
      let result: BookingDto;
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
          expectedVersion: options.initialBooking?.version!,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          slotStartAt: selectedSlot.slotStartAt,
          barbermanId: selectedProfessionalId ?? undefined,
          serviceIds: selectedServiceIds,
          expectedTotalPriceInCents: totalPriceInCents,
          expectedDurationInMinutes: totalDurationInMinutes,
        });

        const opResult = await bookingOperationEngine.submit(prepared);
        if (opResult.state === 'APPLIED' && opResult.resource?.data?.booking) {
          result = opResult.resource.data.booking;
        } else {
          throw new Error('Remarcação não foi confirmada pelo servidor.');
        }
      } else {
        const prepared = await bookingOperationEngine.prepare({
          action: 'CREATE',
          actorId: identity.id,
          scope: mode,
          shopId,
          customerId: customer?.id,
          serviceIds: selectedServiceIds,
          barbermanId: selectedProfessionalId!,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          slotStartAt: selectedSlot.slotStartAt,
          expectedTotalPriceInCents: totalPriceInCents,
          expectedDurationInMinutes: totalDurationInMinutes,
        });

        const opResult = await bookingOperationEngine.submit(prepared);
        if (opResult.state === 'APPLIED' && opResult.resource?.data?.booking) {
          result = opResult.resource.data.booking;
        } else {
          throw new Error('Agendamento não foi confirmado pelo servidor.');
        }
      }

      setConfirmedBooking(result);
      setStatus('confirmed');
      setStep('RESULT');

      // Invalidação granular de cache após confirmação
      const oldDate = options.initialBooking ? String(options.initialBooking.date).split('T')[0] : '';
      await invalidateBookingQueries(queryClient, {
        actorId: identity?.id,
        shopId,
        bookingId: result.id,
        oldProfessionalId: options.initialBooking?.barbermanId,
        newProfessionalId: selectedProfessionalId,
        dates: [selectedDate, oldDate].filter(Boolean),
      });
    } catch (err: any) {
      if (err.requestId) { setUncertainKey(err.requestId); setStatus('uncertain'); setStep('UNCERTAIN'); setErrorMessage(err.message); return; }
      const normalized = normalizeBookingError(err);
      if (normalized.code === 'QUOTE_CHANGED') {
        setStatus('error');
        setQuoteMismatch(true);
        setAuthoritativeQuote(normalized.quote ?? null);
        setErrorMessage(
          normalized.message ||
            'Os valores ou durações foram alterados. Revise o novo orçamento antes de confirmar.'
        );
        // Retorna à revisão para reconfirmação explícita do usuário
        setStep('REVIEW');
      } else if (
        normalized.code === 'NETWORK_OR_TIMEOUT' ||
        normalized.isNetworkError ||
        !err?.status
      ) {
        setStatus('uncertain');
        setUncertainKey(null);
        setErrorMessage(normalized.message);
        setStep('UNCERTAIN');
      } else {
        setStatus('error');
        setErrorMessage(
          normalized.message || 'Falha ao concluir agendamento. Verifique as informações.'
        );
      }
    } finally {
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
  ]);

  // Reconciliação / ação de fechar tentativa incerta
  const resolveUncertainAttempt = useCallback(async () => {
    if (!uncertainKey || !identity?.id) return;
    try {
      await operationAttemptStore.clearResolved(identity.id);
      setUncertainKey(null);
      setStatus('reviewing');
      setStep('REVIEW');
    } catch {
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
    professionals: mode === 'UNIT' && ownAgendaOnly ? (professionalsQuery.data ?? []).filter(p => p.id === identity?.id) : professionalsQuery.data ?? [],
    availabilitySlots: availabilityQuery.data?.slots ?? [],
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
    isLoading:
      servicesQuery.isLoading ||
      professionalsQuery.isLoading ||
      barbershopQuery.isLoading,
    isAvailabilityLoading: availabilityQuery.isLoading,
    servicesError: servicesQuery.error ? ((servicesQuery.error as any)?.message || 'Falha ao carregar serviços.') : null,
    professionalsError: professionalsQuery.error ? ((professionalsQuery.error as any)?.message || 'Falha ao carregar profissionais.') : null,
    availabilityError: availabilityQuery.error ? ((availabilityQuery.error as any)?.message || 'Falha ao carregar horários disponíveis.') : null,
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
