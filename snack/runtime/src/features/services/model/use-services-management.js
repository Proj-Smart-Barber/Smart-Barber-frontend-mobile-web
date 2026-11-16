import { invalidateCatalogConsumers } from '../../../shared/cache/catalog-invalidation';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '../api/services.api';
import { useSession } from '../../auth';
export function useServicesManagement(barbershopId) {
    const queryClient = useQueryClient();
    const { token, isOwner } = useSession();
    const [filterTab, setFilterTab] = useState('all');
    const [editingService, setEditingService] = useState(null);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [toggleError, setToggleError] = useState(null);
    const queryKey = useMemo(() => ['services', barbershopId, { includeInactive: true }], [barbershopId]);
    const { data, isLoading, isRefetching, error, refetch, } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!barbershopId) {
                return { items: [], total: 0, page: 1, limit: 100 };
            }
            return servicesApi.listServices(barbershopId, { limit: 100, includeInactive: true }, token);
        },
        enabled: !!barbershopId,
    });
    const createMutation = useMutation({
        mutationFn: async (input) => {
            if (!barbershopId)
                throw new Error('Barbearia não selecionada.');
            return servicesApi.createService(barbershopId, input, token);
        },
        onSuccess: () => {
            void invalidateCatalogConsumers(queryClient, barbershopId !== null && barbershopId !== void 0 ? barbershopId : undefined);
            setIsFormModalOpen(false);
            setEditingService(null);
        },
    });
    const updateMutation = useMutation({
        mutationFn: async ({ serviceId, data: input, }) => {
            if (!barbershopId)
                throw new Error('Barbearia não selecionada.');
            return servicesApi.updateService(barbershopId, serviceId, input, token);
        },
        onSuccess: () => {
            void invalidateCatalogConsumers(queryClient, barbershopId !== null && barbershopId !== void 0 ? barbershopId : undefined);
            setIsFormModalOpen(false);
            setEditingService(null);
        },
    });
    const toggleActivationMutation = useMutation({
        mutationFn: async ({ serviceId, isActive, }) => {
            if (!barbershopId)
                throw new Error('Barbearia não selecionada.');
            setTogglingId(serviceId);
            setToggleError(null);
            return servicesApi.toggleServiceActivation(barbershopId, serviceId, isActive, token);
        },
        onMutate: async ({ serviceId, isActive }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData(queryKey);
            if (previousData) {
                queryClient.setQueryData(queryKey, {
                    ...previousData,
                    items: previousData.items.map((item) => item.id === serviceId ? { ...item, isActive } : item),
                });
            }
            return { previousData };
        },
        onError: (_err, _vars, context) => {
            if (context === null || context === void 0 ? void 0 : context.previousData) {
                queryClient.setQueryData(queryKey, context.previousData);
            }
            setToggleError('Falha ao atualizar status do serviço. A alteração foi desfeita.');
        },
        onSettled: () => {
            setTogglingId(null);
            void invalidateCatalogConsumers(queryClient, barbershopId !== null && barbershopId !== void 0 ? barbershopId : undefined);
        },
    });
    const items = useMemo(() => (data === null || data === void 0 ? void 0 : data.items) || [], [data === null || data === void 0 ? void 0 : data.items]);
    const filteredItems = useMemo(() => {
        if (filterTab === 'active') {
            return items.filter((s) => s.isActive);
        }
        if (filterTab === 'inactive') {
            return items.filter((s) => !s.isActive);
        }
        return items;
    }, [items, filterTab]);
    const totalCount = (data === null || data === void 0 ? void 0 : data.total) !== undefined ? data.total : items.length;
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
    const openEditModal = (service) => {
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
