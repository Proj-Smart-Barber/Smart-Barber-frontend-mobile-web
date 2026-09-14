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

export function useAvailabilityViewModel(sessionBarbershopId?: string | null) {
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
  const scheduleQuery = useWeeklyScheduleQuery(barbershopId);
  const exceptionsQuery = useExceptionsQuery(barbershopId);

  const saveScheduleMutation = useSaveWeeklyScheduleMutation(barbershopId);
  const createExceptionMutation = useCreateExceptionMutation(barbershopId);
  const updateExceptionMutation = useUpdateExceptionMutation(barbershopId);
  const removeExceptionMutation = useRemoveExceptionMutation(barbershopId);

  const [formError, setFormError] = useState<NormalizedAvailabilityError | null>(null);

  const scheduleDays = useMemo(
    () => buildScheduleDayViews(scheduleQuery.data ?? []),
    [scheduleQuery.data],
  );

  const isLoadingInitial =
    hasHttpConfiguration &&
    (barbershopQuery.isLoading || scheduleQuery.isLoading || exceptionsQuery.isLoading);

  const isFatalError =
    !hasHttpConfiguration ||
    ((barbershopQuery.isError || scheduleQuery.isError || exceptionsQuery.isError) &&
      !isLoadingInitial);

  const isSaving =
    saveScheduleMutation.isPending ||
    createExceptionMutation.isPending ||
    updateExceptionMutation.isPending ||
    removeExceptionMutation.isPending;

  const initialQueryError =
    barbershopQuery.error ?? scheduleQuery.error ?? exceptionsQuery.error ?? null;

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
        await saveScheduleMutation.mutateAsync(entries);
        return true;
      } catch (error) {
        setFormError(normalizeAvailabilityError(error));
        return false;
      }
    },
    [saveScheduleMutation],
  );

  const handleCreateException = useCallback(
    async (exception: Omit<AvailabilityException, 'id'>) => {
      setFormError(null);
      try {
        await createExceptionMutation.mutateAsync(exception);
        return true;
      } catch (error) {
        setFormError(normalizeAvailabilityError(error));
        return false;
      }
    },
    [createExceptionMutation],
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

  return {
    barbershop: barbershopQuery.data ?? null,
    scheduleDays,
    exceptions: exceptionsQuery.data ?? [],

    isLoadingInitial,
    isSaving,
    isFatalError,
    configurationError,

    formError,
    clearFormError,

    handleSaveSchedule,
    handleCreateException,
    handleUpdateException,
    handleRemoveException,
  };
}
