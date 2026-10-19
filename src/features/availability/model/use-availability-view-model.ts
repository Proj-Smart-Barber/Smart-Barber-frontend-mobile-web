import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/features/auth';
import { ENV } from '@/shared/config/env';
import {
  useBarbershopQuery,
  useWeeklyScheduleQuery,
  useExceptionsQuery,
  useSaveWeeklyScheduleMutation,
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

  // Consulta da jornada geral como fallback de herança quando barbermanId está ativo
  const generalScheduleQuery = useWeeklyScheduleQuery(
    barbershopId,
    undefined,
  );

  const exceptionsQuery = useExceptionsQuery(
    barbershopId,
    barbermanId ?? undefined,
  );

  const saveScheduleMutation = useSaveWeeklyScheduleMutation(
    barbershopId,
    barbermanId ?? undefined,
  );
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

  // Determinar se os dados atuais são herdados da jornada geral
  const hasIndividualEntries = Boolean(
    barbermanId &&
      scopedScheduleQuery.data &&
      scopedScheduleQuery.data.length > 0,
  );

  const isInherited = Boolean(
    barbermanId &&
      scopedScheduleQuery.data &&
      scopedScheduleQuery.data.length === 0,
  );

  // Montar as entradas da jornada considerando herança
  const effectiveEntries = useMemo(() => {
    if (!barbermanId) {
      return scopedScheduleQuery.data ?? [];
    }

    if (hasIndividualEntries) {
      return scopedScheduleQuery.data ?? [];
    }

    if (isInherited) {
      // Herda horários da barbearia, marcando o barbermanId para o formulário
      return (generalScheduleQuery.data ?? []).map((entry) => ({
        ...entry,
        barbermanId,
      }));
    }

    return scopedScheduleQuery.data ?? [];
  }, [
    barbermanId,
    hasIndividualEntries,
    isInherited,
    scopedScheduleQuery.data,
    generalScheduleQuery.data,
  ]);

  const scheduleDays = useMemo(
    () => buildScheduleDayViews(effectiveEntries),
    [effectiveEntries],
  );

  const isLoadingInitial =
    hasHttpConfiguration &&
    (barbershopQuery.isLoading ||
      scopedScheduleQuery.isLoading ||
      (Boolean(barbermanId) && generalScheduleQuery.isLoading) ||
      exceptionsQuery.isLoading);

  const isFatalError =
    !hasHttpConfiguration ||
    ((barbershopQuery.isError || scopedScheduleQuery.isError || exceptionsQuery.isError) &&
      !isLoadingInitial);

  const isSaving =
    saveScheduleMutation.isPending ||
    createExceptionMutation.isPending ||
    updateExceptionMutation.isPending ||
    removeExceptionMutation.isPending;

  const initialQueryError =
    barbershopQuery.error ?? scopedScheduleQuery.error ?? exceptionsQuery.error ?? null;

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
      setFormError(null);
      try {
        const scopedEntries = entries.map((entry) => ({
          ...entry,
          barbermanId: barbermanId ?? null,
        }));
        await saveScheduleMutation.mutateAsync(scopedEntries);
        return true;
      } catch (error) {
        setFormError(normalizeAvailabilityError(error));
        return false;
      }
    },
    [saveScheduleMutation, barbermanId],
  );

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
    isInherited,

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
