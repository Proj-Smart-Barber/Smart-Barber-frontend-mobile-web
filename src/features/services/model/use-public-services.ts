import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { servicesApi } from '../api/services.api';
import { barbershopApi } from '@/features/barbershop';
import type { Service } from './service.types';

export function usePublicServices(barbershopId?: string | null) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);

  // Consulta autoritativa da barbearia
  const barbershopQuery = useQuery({
    queryKey: ['barbershop', 'public', barbershopId],
    queryFn: async () => {
      if (!barbershopId) throw new Error('ID da barbearia não fornecido.');
      return barbershopApi.getBarbershop(barbershopId);
    },
    enabled: !!barbershopId,
  });

  // Consulta do catálogo de serviços ativos
  const servicesQuery = useQuery({
    queryKey: ['services', 'public', barbershopId],
    queryFn: async () => {
      if (!barbershopId) {
        return { items: [], total: 0, page: 1, limit: 100 };
      }
      return servicesApi.listServices(barbershopId, {
        limit: 100,
        includeInactive: false,
      });
    },
    enabled: !!barbershopId,
  });

  const availableServices = useMemo(
    () => servicesQuery.data?.items.filter((s) => s.isActive) || [],
    [servicesQuery.data?.items],
  );

  const toggleService = useCallback((serviceId: string) => {
    setSelectedIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  }, []);

  const isSelected = useCallback(
    (serviceId: string) => selectedIds.includes(serviceId),
    [selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const selectedServices = useMemo(() => {
    return availableServices.filter((s) => selectedIds.includes(s.id));
  }, [availableServices, selectedIds]);

  const totalPriceInCents = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.priceInCents, 0);
  }, [selectedServices]);

  const totalDurationInMinutes = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + s.durationInMinutes, 0);
  }, [selectedServices]);

  const openHandoffModal = () => setIsHandoffModalOpen(true);
  const closeHandoffModal = () => setIsHandoffModalOpen(false);

  return {
    barbershop: barbershopQuery.data,
    services: availableServices,
    isLoading: barbershopQuery.isLoading || servicesQuery.isLoading,
    isRefetching: servicesQuery.isRefetching,
    error: barbershopQuery.error || servicesQuery.error,
    refetch: () => {
      barbershopQuery.refetch();
      servicesQuery.refetch();
    },
    selectedIds,
    selectedServices,
    totalPriceInCents,
    totalDurationInMinutes,
    hasSelectedServices: selectedServices.length > 0,
    toggleService,
    isSelected,
    clearSelection,
    isHandoffModalOpen,
    openHandoffModal,
    closeHandoffModal,
  };
}
