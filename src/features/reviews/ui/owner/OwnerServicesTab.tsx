import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Badge, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import { StarRating } from '../StarRating';
import { useOwnerServiceMetrics } from '../../model/use-owner-reviews';
import type { ReviewSourceDto } from '../../api/owner-reviews.types';
import { ReviewErrorBanner } from './ReviewErrorBanner';

interface OwnerServicesTabProps {
  shopId: string;
  source: ReviewSourceDto;
  startDate?: string;
  endDate?: string;
  onSelectServiceToFilter: (serviceId: string) => void;
}

export function OwnerServicesTab({
  shopId,
  source,
  startDate,
  endDate,
  onSelectServiceToFilter,
}: OwnerServicesTabProps) {
  const { colors, spacing, radius } = useTheme();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [shopId, source, startDate, endDate, includeInactive]);

  const { data, isLoading, isError, error, refetch } = useOwnerServiceMetrics(
    shopId,
    {
      source,
      startDate,
      endDate,
      includeInactive,
      page,
      limit: 10,
    },
  );

  if (isLoading && !data) {
    return (
      <View style={{ gap: spacing[3] }}>
        <Skeleton width="100%" height={80} />
        <Skeleton width="100%" height={80} />
        <Skeleton width="100%" height={80} />
      </View>
    );
  }

  if (isError && !data) {
    return (
      <ReviewErrorBanner
        error={error}
        hasCachedData={false}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const items = data?.items ?? [];
  const totalItems = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / 10));
  const totalServices = data?.totalServices ?? totalItems;
  const evaluatedServices = data?.evaluatedServices ?? 0;
  const coveragePercentage = data?.coveragePercentage ?? 0;

  return (
    <View style={{ gap: spacing[3] }}>
      {isError ? (
        <ReviewErrorBanner
          error={error}
          hasCachedData={Boolean(data)}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}

      {/* Cabeçalho da Aba com Cobertura Global e Filtro de Inativos */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[2],
        }}
      >
        <View style={{ gap: 2 }}>
          <Text variant="subhead" weight="bold" color={colors.text.primary}>
            Serviços ({totalItems})
          </Text>
          <Text variant="caption" color={colors.text.muted}>
            Cobertura global no período: {evaluatedServices}/{totalServices} avaliados ({coveragePercentage}%)
          </Text>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Incluir serviços inativos com histórico"
          onPress={() => setIncludeInactive((prev) => !prev)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
        >
          <Ionicons
            name={includeInactive ? 'checkbox' : 'square-outline'}
            size={18}
            color={includeInactive ? colors.brand.primary : colors.text.muted}
          />
          <Text variant="caption" color={colors.text.secondary}>
            Incluir inativos
          </Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <LiquidGlassView
          variant="card"
          elevated
          style={{ borderRadius: radius.md }}
          contentStyle={{ padding: spacing[4], alignItems: 'center' }}
        >
          <Text variant="bodySm" color={colors.text.muted}>
            Nenhum serviço encontrado no contexto selecionado.
          </Text>
        </LiquidGlassView>
      ) : (
        items.map((service) => {
          const hasReviews = service.reviewCount > 0;
          const formattedRating =
            service.averageRating !== null
              ? service.averageRating.toFixed(1)
              : '--';

          return (
            <LiquidGlassView
              key={service.serviceId}
              variant="card"
              elevated
              style={{ borderRadius: radius.lg }}
              contentStyle={{ padding: spacing[4], gap: spacing[3] }}
            >
              {/* Linha Superior: Nome do Serviço e Status */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" weight="bold" color={colors.text.primary}>
                    {service.serviceName}
                  </Text>
                  {!service.isActive ? (
                    <Badge label="Inativo no catálogo" tone="warning" size="sm" />
                  ) : null}
                </View>

                {service.isSmallSample && hasReviews ? (
                  <Badge label="Amostra reduzida (< 5)" tone="warning" size="sm" />
                ) : null}
              </View>

              {/* Linha Central: Nota, Estrelas e Contagem */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: spacing[2],
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[2],
                  }}
                >
                  <Text variant="h2" weight="extraBold" color={colors.text.primary}>
                    {formattedRating}
                  </Text>
                  {service.averageRating !== null ? (
                    <StarRating rating={service.averageRating} size={18} />
                  ) : null}
                  <Text variant="caption" color={colors.text.muted}>
                    ({service.reviewCount}{' '}
                    {service.reviewCount === 1 ? 'avaliação' : 'avaliações'})
                  </Text>
                </View>

                {/* Motivo de ausência de avaliações quando reviewCount === 0 */}
                {!hasReviews ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.text.muted}
                    />
                    <Text variant="caption" color={colors.text.muted}>
                      {service.absenceReason === 'NO_COMPLETED_BOOKINGS'
                        ? 'Sem atendimentos concluídos no período'
                        : `Aguardando retorno do cliente (${service.completedBookingsCount} concluídos)`}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Linha Inferior: % Notas 1-2 e Ação Contextual */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: spacing[2],
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border.subtle,
                }}
              >
                <Text variant="caption" color={colors.text.secondary}>
                  Notas 1-2 estrelas:{' '}
                  <Text
                    variant="caption"
                    weight="bold"
                    color={
                      service.percentage1to2Stars > 10
                        ? colors.feedback.error
                        : colors.text.primary
                    }
                  >
                    {service.percentage1to2Stars}%
                  </Text>
                </Text>

                {hasReviews ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver avaliações de ${service.serviceName}`}
                    onPress={() => onSelectServiceToFilter(service.serviceId)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Text variant="caption" weight="bold" color={colors.brand.primary}>
                      Ver feedbacks
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={colors.brand.primary}
                    />
                  </Pressable>
                ) : null}
              </View>
            </LiquidGlassView>
          );
        })
      )}

      {totalPages > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: spacing[2],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Página anterior de serviços"
            disabled={page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            style={{ opacity: page <= 1 ? 0.4 : 1, padding: spacing[2] }}
          >
            <Text variant="caption" weight="bold" color={colors.brand.primary}>
              Anterior
            </Text>
          </Pressable>

          <Text variant="caption" color={colors.text.muted}>
            Página {page} de {totalPages}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próxima página de serviços"
            disabled={page >= totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ opacity: page >= totalPages ? 0.4 : 1, padding: spacing[2] }}
          >
            <Text variant="caption" weight="bold" color={colors.brand.primary}>
              Próxima
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
