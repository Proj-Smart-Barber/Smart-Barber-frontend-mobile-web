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

export function useAvailabilityViewModel() {
  /**
   * O backend atual ainda não devolve a barbearia associada ao staff em /me.
   * O ID fica em configuração pública, em vez de depender do adapter mock.
   * Quando o backend expuser essa associação, apenas esta origem precisa mudar.
   */
  const barbershopId = ENV.BARBERSHOP_ID;

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
    barbershopQuery.isLoading || scheduleQuery.isLoading || exceptionsQuery.isLoading;

  const isFatalError =
    (barbershopQuery.isError || scheduleQuery.isError || exceptionsQuery.isError) &&
    !isLoadingInitial;

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
    // Dados
    barbershop: barbershopQuery.data ?? null,
    scheduleDays,
    exceptions: exceptionsQuery.data ?? [],

    // Estados de carregamento
    isLoadingInitial,
    isSaving,
    isFatalError,

    // Erros
    formError,
    clearFormError,

    // Ações
    handleSaveSchedule,
    handleCreateException,
    handleRemoveException,
  };
}
