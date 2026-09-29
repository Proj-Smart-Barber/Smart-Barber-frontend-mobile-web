import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../api/services.api';
import type {
  Service,
  ListServicesResponse,
  CreateServiceInput,
  UpdateServiceInput,
} from './service.types';
import { useSession } from '@/features/auth';

export type ServiceFilterTab = 'all' | 'active' | 'inactive';

export function useServicesManagement(barbershopId?: string | null) {
  const queryClient = useQueryClient();
  const { token, isOwner } = useSession();
  const [filterTab, setFilterTab] = useState<ServiceFilterTab>('all');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const queryKey = useMemo(
    () => ['services', barbershopId, { includeInactive: true }],
    [barbershopId],
  );

  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!barbershopId) {
        return { items: [], total: 0, page: 1, limit: 100 };
      }
      return servicesApi.listServices(
        barbershopId,
        { limit: 100, includeInactive: true },
        token,
      );
    },
    enabled: !!barbershopId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      if (!barbershopId) throw new Error('Barbearia não selecionada.');
      return servicesApi.createService(barbershopId, input, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', barbershopId] });
      setIsFormModalOpen(false);
      setEditingService(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      serviceId,
      data: input,
    }: {
      serviceId: string;
      data: UpdateServiceInput;
    }) => {
      if (!barbershopId) throw new Error('Barbearia não selecionada.');
      return servicesApi.updateService(barbershopId, serviceId, input, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', barbershopId] });
      setIsFormModalOpen(false);
      setEditingService(null);
    },
  });

  const toggleActivationMutation = useMutation({
    mutationFn: async ({
      serviceId,
      isActive,
    }: {
      serviceId: string;
      isActive: boolean;
    }) => {
      if (!barbershopId) throw new Error('Barbearia não selecionada.');
      setTogglingId(serviceId);
      setToggleError(null);
      return servicesApi.toggleServiceActivation(barbershopId, serviceId, isActive, token);
    },
    onMutate: async ({ serviceId, isActive }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<ListServicesResponse>(queryKey);

      if (previousData) {
        queryClient.setQueryData<ListServicesResponse>(queryKey, {
          ...previousData,
          items: previousData.items.map((item) =>
            item.id === serviceId ? { ...item, isActive } : item,
          ),
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      setToggleError('Falha ao atualizar status do serviço. A alteração foi desfeita.');
    },
    onSettled: () => {
      setTogglingId(null);
      queryClient.invalidateQueries({ queryKey: ['services', barbershopId] });
    },
  });

  const items = useMemo(() => data?.items || [], [data?.items]);

  const filteredItems = useMemo(() => {
    if (filterTab === 'active') {
      return items.filter((s) => s.isActive);
    }
    if (filterTab === 'inactive') {
      return items.filter((s) => !s.isActive);
    }
    return items;
  }, [items, filterTab]);

  const totalCount = data?.total !== undefined ? data.total : items.length;
  const isPartial = items.length < totalCount;

  const counts = useMemo(() => {
    const total = totalCount;
    const loadedTotal = items.length;
    const active = items.filter((s) => s.isActive).length;
    const inactive = items.filter((s) => !s.isActive).length;
    return { total, loadedTotal, active, inactive, isPartial };
  }, [items, totalCount, isPartial]);

  const openCreateModal = () => {
    setEditingService(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setIsFormModalOpen(true);
  };

  const closeModal = () => {
    setIsFormModalOpen(false);
    setEditingService(null);
  };

  return {
    items: filteredItems,
    allItems: items,
    counts,
    isLoading,
    isRefetching,
    error,
    refetch,
    filterTab,
    setFilterTab,
    isOwner,
    editingService,
    isFormModalOpen,
    openCreateModal,
    openEditModal,
    closeModal,
    createService: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    updateService: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    toggleActivation: toggleActivationMutation.mutateAsync,
    isToggling: toggleActivationMutation.isPending,
    togglingId,
    toggleError,
    clearToggleError: () => setToggleError(null),
  };
}
