import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
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
  const { colors, spacing, radius, components, isDark } = useTheme();
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

  const webBackgroundStyle =
    Platform.OS === 'web'
      ? ({
          backgroundImage:
            isDark
              ? 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.08) 0%, rgba(20, 20, 20, 0.98) 70%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(197, 160, 89, 0.12) 0%, #F7F5F3 70%)',
        } as any)
      : null;

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: colors.background.primary,
          paddingTop: insets.top,
        },
        webBackgroundStyle,
      ]}
    >
      {/* Cabeçalho da Barbearia */}
      <LiquidGlassView
        variant="card"
        elevated={false}
        borderRadius={0}
        borderColor={colors.border.default}
        borderWidth={1}
        style={{
          width: '100%',
        }}
        contentStyle={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[5],
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
              label="Catálogo Oficial"
              tone="neutral"
            />
          </View>

          <Text variant="caption" color={colors.text.muted}>
            Selecione um ou mais serviços abaixo para iniciar seu agendamento.
          </Text>
        </View>
      </LiquidGlassView>

      {/* Lista de Serviços */}
      <ScrollView
        contentContainerStyle={{
          maxWidth: 640,
          width: '100%',
          alignSelf: 'center',
          padding: spacing[4],
          gap: spacing[3],
          paddingBottom: selectedServices.length > 0 ? 140 : insets.bottom + spacing[6],
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
            <Skeleton height={108} borderRadius={radius.lg} />
            <Skeleton height={108} borderRadius={radius.lg} />
            <Skeleton height={108} borderRadius={radius.lg} />
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
