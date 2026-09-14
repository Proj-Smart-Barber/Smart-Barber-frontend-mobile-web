import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ENV } from '@/shared/config/env';
import type {
  AvailabilityException,
  AvailabilitySlot,
  IAvailabilityRepository,
  WeeklyScheduleEntry,
} from './availability.contract';
import { AvailabilityHttpAdapter } from './availability.http';
import { AvailabilityMockAdapter } from './availability.mock';

export const availabilityRepository: IAvailabilityRepository =
  ENV.AVAILABILITY_SOURCE === 'http'
    ? new AvailabilityHttpAdapter()
    : new AvailabilityMockAdapter();

export const AVAILABILITY_QUERY_KEYS = {
  all: (barbershopId: string) => ['availability', barbershopId] as const,
  barbershop: (barbershopId: string) => ['availability', barbershopId, 'barbershop'] as const,
  schedule: (barbershopId: string, barbermanId?: string) =>
    ['availability', barbershopId, 'schedule', barbermanId ?? 'general'] as const,
  exceptions: (barbershopId: string, barbermanId?: string) =>
    ['availability', barbershopId, 'exceptions', barbermanId ?? 'general'] as const,
  slotsBase: (barbershopId: string) => ['availability', barbershopId, 'slots'] as const,
  slots: (barbershopId: string, serviceIds: string[], date: string, barbermanId?: string) =>
    [
      'availability',
      barbershopId,
      'slots',
      [...serviceIds].sort().join(','),
      date,
      barbermanId ?? 'general',
    ] as const,
};

export function useBarbershopQuery(barbershopId: string) {
  return useQuery({
    queryKey: AVAILABILITY_QUERY_KEYS.barbershop(barbershopId),
    queryFn: () => availabilityRepository.getBarbershop(barbershopId),
    enabled: Boolean(barbershopId),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useWeeklyScheduleQuery(barbershopId: string, barbermanId?: string) {
  return useQuery({
    queryKey: AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId),
    queryFn: () => availabilityRepository.getWeeklySchedule(barbershopId, barbermanId),
    enabled: Boolean(barbershopId),
    staleTime: 30_000,
    retry: false,
  });
}

export function useSaveWeeklyScheduleMutation(
  barbershopId: string,
  barbermanId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entries: Omit<WeeklyScheduleEntry, 'id'>[]) =>
      availabilityRepository.saveWeeklySchedule(barbershopId, entries, barbermanId),
    onSuccess: (savedEntries) => {
      queryClient.setQueryData(
        AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId),
        savedEntries,
      );

      // Em HTTP, o GET agora é real; a invalidação confirma o estado persistido.
      if (ENV.AVAILABILITY_SOURCE === 'http') {
        void queryClient.invalidateQueries({
          queryKey: AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId),
        });
      }

      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(barbershopId),
      });
    },
  });
}

export function useExceptionsQuery(barbershopId: string, barbermanId?: string) {
  return useQuery({
    queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
    queryFn: () => availabilityRepository.listExceptions(barbershopId, barbermanId),
    enabled: Boolean(barbershopId),
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreateExceptionMutation(
  barbershopId: string,
  barbermanId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exception: Omit<AvailabilityException, 'id'>) =>
      availabilityRepository.createException(barbershopId, exception),
    onSuccess: (created) => {
      queryClient.setQueryData<AvailabilityException[]>(
        AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
        (current = []) => {
          if (current.some((item) => item.id === created.id)) return current;
          return [...current, created];
        },
      );

      if (ENV.AVAILABILITY_SOURCE === 'http') {
        void queryClient.invalidateQueries({
          queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
        });
      }

      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(barbershopId),
      });
    },
  });
}

export function useUpdateExceptionMutation(
  barbershopId: string,
  barbermanId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exceptionId,
      exception,
    }: {
      exceptionId: string;
      exception: Partial<Omit<AvailabilityException, 'id'>>;
    }) => availabilityRepository.updateException(barbershopId, exceptionId, exception),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<AvailabilityException[]>(
        AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
        (current = []) => [
          ...current.filter((item) => item.id !== variables.exceptionId),
          updated,
        ],
      );

      if (ENV.AVAILABILITY_SOURCE === 'http') {
        void queryClient.invalidateQueries({
          queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
        });
      }

      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(barbershopId),
      });
    },
  });
}

export function useRemoveExceptionMutation(
  barbershopId: string,
  barbermanId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (exceptionId: string) =>
      availabilityRepository.removeException(barbershopId, exceptionId),
    onSuccess: (_data, exceptionId) => {
      queryClient.setQueryData<AvailabilityException[]>(
        AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
        (current = []) => current.filter((item) => item.id !== exceptionId),
      );

      if (ENV.AVAILABILITY_SOURCE === 'http') {
        void queryClient.invalidateQueries({
          queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
        });
      }

      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.slotsBase(barbershopId),
      });
    },
  });
}

export function useAvailabilitySlotsQuery(
  barbershopId: string,
  params: { serviceIds: string[]; date: string; barbermanId?: string },
  enabled = true,
) {
  return useQuery<AvailabilitySlot[]>({
    queryKey: AVAILABILITY_QUERY_KEYS.slots(
      barbershopId,
      params.serviceIds,
      params.date,
      params.barbermanId,
    ),
    queryFn: () => availabilityRepository.getCalculatedAvailability(barbershopId, params),
    enabled: enabled && Boolean(barbershopId) && params.serviceIds.length > 0,
    retry: false,
  });
}
