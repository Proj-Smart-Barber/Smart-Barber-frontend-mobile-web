import { useCallback, useMemo, useState } from 'react';
import { ENV } from '@/shared/config/env';
import {
  useBarbershopQuery,
  useWeeklyScheduleQuery,
  useExceptionsQuery,
  useSaveWeeklyScheduleMutation,
  useCreateExceptionMutation,
  useRemoveExceptionMutation,
} from '../api/availability.api';
import { normalizeAvailabilityError } from '../api/normalize-availability-error';
import { buildScheduleDayViews } from './availability.types';
import type { WeeklyScheduleEntry, AvailabilityException } from '../api/availability.contract';
import type { NormalizedAvailabilityError } from '../api/normalize-availability-error';

export function useAvailabilityViewModel(sessionBarbershopId?: string | null) {
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
    removeExceptionMutation.isPending;

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

  const handleRemoveException = useCallback(
    async (exceptionId: string) => {
      setFormError(null);
      try {
        await removeExceptionMutation.mutateAsync(exceptionId);
      } catch (error) {
        setFormError(normalizeAvailabilityError(error));
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
    handleRemoveException,
  };
}
