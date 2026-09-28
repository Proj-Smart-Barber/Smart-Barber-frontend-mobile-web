import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import {
  Text,
  Badge,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/shared/ui';
import { usePublicServices } from '../model/use-public-services';
import { ServiceCard } from './ServiceCard';
import { SelectedServicesSummary } from './SelectedServicesSummary';

export interface PublicCatalogViewProps {
  barbershopId: string;
}

export function PublicCatalogView({ barbershopId }: PublicCatalogViewProps) {
  const { colors, spacing, radius, components } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    barbershop,
    services,
    isLoading,
    isRefetching,
    error,
    refetch,
    selectedServices,
    totalPriceInCents,
    totalDurationInMinutes,
    toggleService,
    isSelected,
    clearSelection,
    isHandoffModalOpen,
    openHandoffModal,
    closeHandoffModal,
  } = usePublicServices(barbershopId);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: insets.top,
      }}
    >
      {/* Cabeçalho da Barbearia */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[5],
          backgroundColor: components.card.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
        }}
      >
        <View
          style={{
            maxWidth: 640,
            width: '100%',
            alignSelf: 'center',
            gap: spacing[2],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="h2" weight="bold" color={colors.text.primary}>
                {barbershop ? barbershop.name : 'Barbearia'}
              </Text>

              {barbershop?.location ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.text.secondary}
                  />
                  <Text variant="caption" color={colors.text.secondary}>
                    {barbershop.location}
                  </Text>
                </View>
              ) : null}
            </View>

            <Badge
              label="Atendimento"
              tone="success"
            />
          </View>

          <Text variant="caption" color={colors.text.muted}>
            Selecione um ou mais serviços abaixo para iniciar seu agendamento.
          </Text>
        </View>
      </View>

      {/* Lista de Serviços */}
      <ScrollView
        contentContainerStyle={{
          maxWidth: 640,
          width: '100%',
          alignSelf: 'center',
          padding: spacing[4],
          gap: spacing[3],
          paddingBottom: selectedServices.length > 0 ? 120 : insets.bottom + spacing[6],
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
          />
        }
      >
        {isLoading ? (
          <View style={{ gap: spacing[3] }}>
            <Skeleton height={88} style={{ borderRadius: radius.lg }} />
            <Skeleton height={88} style={{ borderRadius: radius.lg }} />
            <Skeleton height={88} style={{ borderRadius: radius.lg }} />
          </View>
        ) : error ? (
          <ErrorState
            title="Não foi possível carregar os serviços"
            description={
              error instanceof Error
                ? error.message
                : 'Ocorreu um erro ao consultar o catálogo da barbearia.'
            }
            onRetry={() => {
              void refetch();
            }}
          />
        ) : services.length === 0 ? (
          <EmptyState
            title="Catálogo indisponível"
            description="Esta barbearia ainda não possui serviços ativos disponíveis para agendamento online."
          />
        ) : (
          <View style={{ gap: spacing[2] }}>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={isSelected(service.id)}
                onSelect={() => toggleService(service.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Resumo e Ação de Agendamento */}
      <SelectedServicesSummary
        selectedServices={selectedServices}
        totalPriceInCents={totalPriceInCents}
        totalDurationInMinutes={totalDurationInMinutes}
        onClear={clearSelection}
        isModalOpen={isHandoffModalOpen}
        onOpenModal={openHandoffModal}
        onCloseModal={closeHandoffModal}
      />
    </View>
  );
}
