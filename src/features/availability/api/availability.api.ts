import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AvailabilityException,
  AvailabilitySlot,
  IAvailabilityRepository,
  WeeklyScheduleEntry,
} from './availability.contract';
import { AvailabilityMockAdapter } from './availability.mock';

// Port / Adapter singleton — substituir por AvailabilityHttpAdapter quando a API estiver pronta.
export const availabilityRepository: IAvailabilityRepository = new AvailabilityMockAdapter();

export const AVAILABILITY_QUERY_KEYS = {
  all: (barbershopId: string) => ['availability', barbershopId] as const,
  barbershop: (barbershopId: string) => ['availability', barbershopId, 'barbershop'] as const,
  schedule: (barbershopId: string, barbermanId?: string) =>
    ['availability', barbershopId, 'schedule', barbermanId ?? 'general'] as const,
  exceptions: (barbershopId: string, barbermanId?: string) =>
    ['availability', barbershopId, 'exceptions', barbermanId ?? 'general'] as const,
  slots: (barbershopId: string, serviceId: string, date: string, barbermanId?: string) =>
    ['availability', barbershopId, 'slots', serviceId, date, barbermanId ?? 'general'] as const,
};

export function useBarbershopQuery(barbershopId: string) {
  return useQuery({
    queryKey: AVAILABILITY_QUERY_KEYS.barbershop(barbershopId),
    queryFn: () => availabilityRepository.getBarbershop(barbershopId),
    staleTime: 5 * 60_000, // barbearia muda raramente
    retry: false,
  });
}

export function useWeeklyScheduleQuery(barbershopId: string, barbermanId?: string) {
  return useQuery({
    queryKey: AVAILABILITY_QUERY_KEYS.schedule(barbershopId, barbermanId),
    queryFn: () => availabilityRepository.getWeeklySchedule(barbershopId, barbermanId),
    retry: false,
  });
}

export function useSaveWeeklyScheduleMutation(barbershopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entries: Omit<WeeklyScheduleEntry, 'id'>[]) =>
      availabilityRepository.saveWeeklySchedule(barbershopId, entries),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.all(barbershopId),
      });
    },
  });
}

export function useExceptionsQuery(barbershopId: string, barbermanId?: string) {
  return useQuery({
    queryKey: AVAILABILITY_QUERY_KEYS.exceptions(barbershopId, barbermanId),
    queryFn: () => availabilityRepository.listExceptions(barbershopId, barbermanId),
    retry: false,
  });
}

export function useCreateExceptionMutation(barbershopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exception: Omit<AvailabilityException, 'id'>) =>
      availabilityRepository.createException(barbershopId, exception),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.all(barbershopId),
      });
    },
  });
}

export function useUpdateExceptionMutation(barbershopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      exceptionId,
      exception,
    }: {
      exceptionId: string;
      exception: Partial<Omit<AvailabilityException, 'id'>>;
    }) => availabilityRepository.updateException(barbershopId, exceptionId, exception),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.all(barbershopId),
      });
    },
  });
}

export function useRemoveExceptionMutation(barbershopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exceptionId: string) =>
      availabilityRepository.removeException(barbershopId, exceptionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: AVAILABILITY_QUERY_KEYS.all(barbershopId),
      });
    },
  });
}

export function useAvailabilitySlotsQuery(
  barbershopId: string,
  params: { serviceId: string; date: string; barbermanId?: string },
  enabled = true,
) {
  return useQuery<AvailabilitySlot[]>({
    queryKey: AVAILABILITY_QUERY_KEYS.slots(
      barbershopId,
      params.serviceId,
      params.date,
      params.barbermanId,
    ),
    queryFn: () => availabilityRepository.getCalculatedAvailability(barbershopId, params),
    enabled,
    retry: false,
  });
}
