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
import { operationAttemptStore } from '@/shared/operations/operation-attempt-store';
import type { BookingDto, ProfessionalDto } from '../api/bookings.dto';
import type { Service } from '@/features/services/model/service.types';
import type { AuthoritativeQuote } from '../lib/normalize-booking-error';

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
  const { identity, status: sessionStatus } = useSession();

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
    queryFn: async () => {
      const res = await servicesApi.listServices(shopId, { limit: 100, includeInactive: false });
      return res.items || [];
    },
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

  // Se BARBER operando em modo UNIT, fixa o profissional para ele mesmo
  useEffect(() => {
    if (mode === 'UNIT' && identity?.accountType === 'BARBER') {
      setSelectedProfessionalId(identity.id);
    }
  }, [mode, identity]);

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

      const transport = {
        createBooking: async (payload: any, idempotencyKey?: string) => {
          if (mode === 'UNIT') {
            return createOperationalBooking(
              shopId,
              {
                ...payload,
                customerId: customer!.id,
                slotStartAt: selectedSlot.slotStartAt,
              },
              idempotencyKey
            );
          }
          if (bookingId) {
            // Remarcação
            return rescheduleBooking(
              bookingId,
              {
                date: payload.date,
                startTime: payload.startTime,
                barbermanId: payload.barbermanId,
                serviceIds: payload.serviceIds,
                slotStartAt: selectedSlot.slotStartAt,
                expectedTotalPriceInCents: payload.expectedTotalPriceInCents,
                expectedDurationInMinutes: payload.expectedDurationInMinutes,
                scope: 'PERSONAL',
              },
              idempotencyKey
            );
          }
          return createBooking(
            {
              ...payload,
              shopId,
              slotStartAt: selectedSlot.slotStartAt,
              scope: 'PERSONAL',
            },
            idempotencyKey
          );
        },
        getBookingById: async () => {
          throw new Error('Not implemented inline');
        },
      };

      const engine = new BookingFlowEngine(
        {
          shopId,
          serviceIds: selectedServiceIds,
          barbermanId: selectedProfessionalId,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          expectedTotalPriceInCents: totalPriceInCents,
          expectedDurationInMinutes: totalDurationInMinutes,
          scope: mode,
          customerId: customer?.id,
        },
        transport,
        {
          serverClock,
          store: operationAttemptStore,
          actorId: identity?.id || 'guest-draft',
          scope: mode,
        }
      );

      activeEngineRef.current = engine;
      const result = await engine.submit();

      setConfirmedBooking(result);
      setStatus('confirmed');
      setStep('RESULT');

      // Invalidação granular de cache após confirmação
      await invalidateBookingQueries(queryClient, {
        actorId: identity?.id,
        shopId,
        bookingId: result.id,
        newProfessionalId: selectedProfessionalId,
        dates: [selectedDate],
      });
    } catch (err: any) {
      const engineState = activeEngineRef.current?.state;
      if (engineState?.quoteMismatch) {
        setStatus('error');
        setQuoteMismatch(true);
        setAuthoritativeQuote(engineState.authoritativeQuote ?? null);
        setErrorMessage(
          engineState.errorMessage ||
            'Os valores ou durações foram alterados. Revise o novo orçamento antes de confirmar.'
        );
        // Retorna à revisão para reconfirmação explícita do usuário
        setStep('REVIEW');
      } else if (engineState?.status === 'uncertain') {
        setStatus('uncertain');
        setUncertainKey(activeEngineRef.current?.key ?? null);
        setErrorMessage(engineState.errorMessage);
        setStep('UNCERTAIN');
      } else {
        setStatus('error');
        setErrorMessage(
          err?.message || 'Falha ao concluir agendamento. Verifique as informações.'
        );
      }
    } finally {
      isSubmittingRef.current = false;
    }
  }, [
    mode,
    shopId,
    bookingId,
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

  return {
    mode,
    step,
    shopId,
    barbershop: barbershopQuery.data,
    services: availableServices,
    professionals: professionalsQuery.data ?? [],
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
    toggleService,
    selectProfessional,
    selectDate,
    selectSlot,
    setCustomer,
    goToStep,
    submitBooking,
    resolveUncertainAttempt,
  };
}
