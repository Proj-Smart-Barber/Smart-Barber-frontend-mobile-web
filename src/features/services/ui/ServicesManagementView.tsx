import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import {
  Text,
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/shared/ui';
import { useServicesManagement } from '../model/use-services-management';
import { ServiceCard } from './ServiceCard';
import { ServiceFormModal } from './ServiceFormModal';
import type { Service } from '../model/service.types';

export interface ServicesManagementViewProps {
  barbershopId: string;
}

export function ServicesManagementView({
  barbershopId,
}: ServicesManagementViewProps) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    items,
    counts,
    isLoading,
    isRefetching,
    error,
    refetch,
    filterTab,
    setFilterTab,
    isFormModalOpen,
    editingService,
    openCreateModal,
    openEditModal,
    closeModal,
    createService,
    isCreating,
    updateService,
    isUpdating,
    toggleActivation,
    isToggling,
  } = useServicesManagement(barbershopId);

  const handleFormSubmit = async (values: {
    title: string;
    description?: string;
    priceInCents: number;
    durationInMinutes: number;
  }) => {
    if (editingService) {
      await updateService({
        serviceId: editingService.id,
        data: values,
      });
    } else {
      await createService(values);
    }
  };

  const handleToggle = (service: Service, nextActive: boolean) => {
    toggleActivation({
      serviceId: service.id,
      isActive: nextActive,
    });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: insets.top,
      }}
    >
      {/* Header Superior */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
          backgroundColor: colors.background.primary,
        }}
      >
        <View
          style={{
            maxWidth: 800,
            width: '100%',
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[3],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed
                  ? colors.surface.selected
                  : 'transparent',
              })}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.text.primary}
              />
            </Pressable>

            <View>
              <Text variant="h2" weight="bold" color={colors.text.primary}>
                Catálogo de Serviços
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {counts.total === 1
                  ? '1 serviço registrado'
                  : `${counts.total} serviços registrados`}
              </Text>
            </View>
          </View>

          <Button
            title="Novo Serviço"
            variant="primary"
            leftIcon={<Ionicons name="add" size={18} color={colors.text.inverse} />}
            onPress={openCreateModal}
            style={{ minHeight: 44, paddingHorizontal: spacing[4] }}
          />
        </View>
      </View>

      {/* Conteúdo Principal */}
      <ScrollView
        contentContainerStyle={{
          maxWidth: 800,
          width: '100%',
          alignSelf: 'center',
          padding: spacing[4],
          gap: spacing[4],
          paddingBottom: insets.bottom + spacing[8],
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* Segmented Filter Tabs */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.background.secondary,
            padding: 4,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border.default,
          }}
        >
          {(
            [
              { key: 'all', label: `Todos (${counts.total})` },
              { key: 'active', label: `Ativos (${counts.active})` },
              { key: 'inactive', label: `Inativos (${counts.inactive})` },
            ] as const
          ).map((tab) => {
            const isSelected = filterTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilterTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                style={{
                  flex: 1,
                  paddingVertical: spacing[2],
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: isSelected
                    ? colors.background.primary
                    : 'transparent',
                }}
              >
                <Text
                  variant="caption"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={
                    isSelected ? colors.brand.primary : colors.text.secondary
                  }
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Estados de Carregamento, Erro ou Lista */}
        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <Skeleton height={80} style={{ borderRadius: radius.lg }} />
            <Skeleton height={80} style={{ borderRadius: radius.lg }} />
            <Skeleton height={80} style={{ borderRadius: radius.lg }} />
          </View>
        ) : error ? (
          <ErrorState
            title="Erro ao carregar catálogo"
            description={
              error instanceof Error
                ? error.message
                : 'Não foi possível carregar os serviços da barbearia.'
            }
            onRetry={() => {
              void refetch();
            }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={
              filterTab === 'inactive'
                ? 'Nenhum serviço inativo'
                : filterTab === 'active'
                ? 'Nenhum serviço ativo'
                : 'Nenhum serviço cadastrado'
            }
            description={
              filterTab === 'all'
                ? 'Crie os serviços que a sua barbearia oferece para disponibilizar aos seus clientes.'
                : 'Não há itens na categoria selecionada.'
            }
            actionLabel={filterTab === 'all' ? 'Criar Primeiro Serviço' : undefined}
            onAction={filterTab === 'all' ? openCreateModal : undefined}
          />
        ) : (
          <View style={{ gap: spacing[2] }}>
            {items.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isManagement
                onEdit={openEditModal}
                onToggleActive={handleToggle}
                isToggling={isToggling}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de Formulário */}
      <ServiceFormModal
        visible={isFormModalOpen}
        onClose={closeModal}
        serviceToEdit={editingService}
        onSubmit={handleFormSubmit}
        isLoading={isCreating || isUpdating}
      />
    </View>
  );
}
