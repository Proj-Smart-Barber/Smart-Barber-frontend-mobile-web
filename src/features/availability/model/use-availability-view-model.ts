import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveScopedSchedule } from './save-barber-schedule';
import { useSession } from '@/features/auth';
import { ENV } from '@/shared/config/env';
import {
  useBarbershopQuery,
  useWeeklyScheduleQuery,
  useExceptionsQuery,
  availabilityRepository,
  AVAILABILITY_QUERY_KEYS,
  useCreateExceptionMutation,
  useUpdateExceptionMutation,
  useRemoveExceptionMutation,
} from '../api/availability.api';
import { normalizeAvailabilityError } from '../api/normalize-availability-error';
import { buildScheduleDayViews } from './availability.types';
import type { WeeklyScheduleEntry, AvailabilityException } from '../api/availability.contract';
import type { NormalizedAvailabilityError } from '../api/normalize-availability-error';

export function useAvailabilityViewModel(
  sessionBarbershopId?: string | null,
  barbermanId?: string | null,
) {
  const { signOut } = useSession();

  const barbershopId =
    ENV.AVAILABILITY_SOURCE === 'http'
      ? sessionBarbershopId ?? ''
      : ENV.BARBERSHOP_ID;

  const configurationError =
    ENV.AVAILABILITY_SOURCE === 'http' && !barbershopId
      ? 'Não foi possível identificar a barbearia vinculada ao usuário autenticado.'
      : null;

  const hasHttpConfiguration = configurationError === null;

  const barbershopQuery = useBarbershopQuery(barbershopId);

  // Escopo específico (geral ou individual)
  const scopedScheduleQuery = useWeeklyScheduleQuery(
    barbershopId,
    barbermanId ?? undefined,
  );

  // A jornada geral limita a validação individual; nunca substitui uma semana vazia.
  const generalScheduleQuery = useWeeklyScheduleQuery(
    barbershopId,
    undefined,
  );

  const exceptionsQuery = useExceptionsQuery(
    barbershopId,
    barbermanId ?? undefined,
  );

  const cache = useQueryClient();
  const writeLock = useRef(false);
  const pendingRef = useRef<'unconfirmed-view' | 'unknown' | null>(null);
  const [schedulePending, setSchedulePending] = useState<typeof pendingRef.current>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const createExceptionMutation = useCreateExceptionMutation(
    barbershopId,
    barbermanId ?? undefined,
  );
  const updateExceptionMutation = useUpdateExceptionMutation(
    barbershopId,
    barbermanId ?? undefined,
  );
  const removeExceptionMutation = useRemoveExceptionMutation(
    barbershopId,
    barbermanId ?? undefined,
  );

  const [formError, setFormError] = useState<NormalizedAvailabilityError | null>(null);

  const scheduleDays = useMemo(
    () => buildScheduleDayViews(scopedScheduleQuery.data ?? []),
    [scopedScheduleQuery.data],
  );

  const isLoadingInitial =
    hasHttpConfiguration &&
    (barbershopQuery.isLoading ||
      scopedScheduleQuery.isLoading ||
      (Boolean(barbermanId) && generalScheduleQuery.isLoading) ||
      exceptionsQuery.isLoading);

  const isFatalError =
    !hasHttpConfiguration ||
    ((barbershopQuery.isError || scopedScheduleQuery.isError || exceptionsQuery.isError ||
      (Boolean(barbermanId) && generalScheduleQuery.isError)) &&
      !isLoadingInitial);

  const isSaving =
    scheduleBusy ||
    createExceptionMutation.isPending ||
    updateExceptionMutation.isPending ||
    removeExceptionMutation.isPending;

  const initialQueryError =
    barbershopQuery.error ?? scopedScheduleQuery.error ?? exceptionsQuery.error ??
    (barbermanId ? generalScheduleQuery.error : null) ?? null;

  const normalizedInitialError = useMemo(
    () => (initialQueryError ? normalizeAvailabilityError(initialQueryError) : null),
    [initialQueryError],
  );

  const isSessionExpired =
    (normalizedInitialError?.isSessionExpired ?? false) ||
    (formError?.isSessionExpired ?? false);

  // Mesmo comportamento da Agenda: se o backend indicar token inválido/expirado
  // (401 ou payload do jsonwebtoken), encerra a sessão e deixa o route guard
  // redirecionar o usuário ao login.
  useEffect(() => {
    if (isSessionExpired) {
      void signOut();
    }
  }, [isSessionExpired, signOut]);

  const handleSaveSchedule = useCallback(
    async (entries: Omit<WeeklyScheduleEntry, 'id'>[]) => {
      if (writeLock.current || pendingRef.current || isFatalError || isLoadingInitial) return null;
      writeLock.current = true;
      setScheduleBusy(true);
      setFormError(null);
      setScheduleMessage(null);
      try {
        const scopedEntries = entries.map(entry => ({ ...entry, barbermanId: barbermanId ?? null }));
        const result = await saveScopedSchedule(
          availabilityRepository, barbershopId, barbermanId ?? undefined, scopedEntries,
        );
        if (result.kind === 'saved') {
          cache.setQueryData(AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId ?? undefined), result.entries);
          void cache.invalidateQueries({ queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(barbershopId) });
        } else if (result.kind !== 'rejected') {
          pendingRef.current = result.kind;
          setSchedulePending(result.kind);
          setScheduleMessage(result.message);
        }
        return result;
      } finally {
        writeLock.current = false;
        setScheduleBusy(false);
      }
    },
    [barbershopId, barbermanId, cache, isFatalError, isLoadingInitial],
  );

  const reconcileSchedule = useCallback(async () => {
    if (writeLock.current || !pendingRef.current) return null;
    writeLock.current = true;
    setScheduleBusy(true);
    try {
      const entries = await availabilityRepository.getWeeklySchedule(barbershopId, barbermanId ?? undefined);
      cache.setQueryData(AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId ?? undefined), entries);
      void cache.invalidateQueries({ queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(barbershopId) });
      pendingRef.current = null;
      setSchedulePending(null);
      setScheduleMessage(null);
      return entries;
    } catch {
      setScheduleMessage('Não foi possível consultar os dados salvos. Sua edição foi mantida. Tente consultar novamente.');
      return null;
    } finally {
      writeLock.current = false;
      setScheduleBusy(false);
    }
  }, [barbershopId, barbermanId, cache]);

  const handleCreateException = useCallback(
    async (exception: Omit<AvailabilityException, 'id'>) => {
      setFormError(null);
      try {
        const scopedException = {
          ...exception,
          barbermanId: barbermanId ?? exception.barbermanId ?? null,
        };
        await createExceptionMutation.mutateAsync(scopedException);
        return true;
      } catch (error) {
        setFormError(normalizeAvailabilityError(error));
        return false;
      }
    },
    [createExceptionMutation, barbermanId],
  );

  const handleUpdateException = useCallback(
    async (
      exceptionId: string,
      exception: Partial<Omit<AvailabilityException, 'id'>>,
    ) => {
      setFormError(null);
      try {
        await updateExceptionMutation.mutateAsync({ exceptionId, exception });
        return true;
      } catch (error) {
        setFormError(normalizeAvailabilityError(error));
        return false;
      }
    },
    [updateExceptionMutation],
  );

  const handleRemoveException = useCallback(
    async (exceptionId: string) => {
      setFormError(null);
      try {
        await removeExceptionMutation.mutateAsync(exceptionId);
        return true;
      } catch (error) {
        setFormError(normalizeAvailabilityError(error));
        return false;
      }
    },
    [removeExceptionMutation],
  );

  const clearFormError = useCallback(() => setFormError(null), []);

  const handleRetry = useCallback(() => {
    setFormError(null);
    void barbershopQuery.refetch();
    void scopedScheduleQuery.refetch();
    if (barbermanId) {
      void generalScheduleQuery.refetch();
    }
    void exceptionsQuery.refetch();
  }, [barbershopQuery, scopedScheduleQuery, generalScheduleQuery, exceptionsQuery, barbermanId]);

  return {
    barbershop: barbershopQuery.data ?? null,
    scheduleDays,
    exceptions: exceptionsQuery.data ?? [],

    barbermanId: barbermanId ?? null,
    isIndividual: Boolean(barbermanId),
    opening: generalScheduleQuery.data,
    schedulePending,
    scheduleMessage,
    reconcileSchedule,

    isLoadingInitial,
    isSaving,
    isFatalError,
    configurationError,

    formError,
    clearFormError,
    handleRetry,

    handleSaveSchedule,
    handleCreateException,
    handleUpdateException,
    handleRemoveException,
  };
}
