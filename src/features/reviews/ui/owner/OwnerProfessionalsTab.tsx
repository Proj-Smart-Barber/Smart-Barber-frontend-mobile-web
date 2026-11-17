import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Badge, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import { StarRating } from '../StarRating';
import { useOwnerProfessionalMetrics } from '../../model/use-owner-reviews';
import type { ReviewSourceDto } from '../../api/owner-reviews.types';
import { ReviewErrorBanner } from './ReviewErrorBanner';

interface OwnerProfessionalsTabProps {
  shopId: string;
  source: ReviewSourceDto;
  startDate?: string;
  endDate?: string;
  onSelectProfessionalToFilter: (professionalId: string) => void;
}

export function OwnerProfessionalsTab({
  shopId,
  source,
  startDate,
  endDate,
  onSelectProfessionalToFilter,
}: OwnerProfessionalsTabProps) {
  const { colors, spacing, radius } = useTheme();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [shopId, source, startDate, endDate]);

  const { data, isLoading, isError, error, refetch } =
    useOwnerProfessionalMetrics(shopId, {
      source,
      startDate,
      endDate,
      page,
      limit: 10,
    });

  if (isLoading && !data) {
    return (
      <View style={{ gap: spacing[3] }}>
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

      <Text variant="subhead" weight="bold" color={colors.text.primary}>
        Profissionais ({totalItems})
      </Text>

      {items.length === 0 ? (
        <LiquidGlassView
          variant="card"
          elevated
          style={{ borderRadius: radius.md }}
          contentStyle={{ padding: spacing[4], alignItems: 'center' }}
        >
          <Text variant="bodySm" color={colors.text.muted}>
            Nenhum profissional com métricas encontrado no período.
          </Text>
        </LiquidGlassView>
      ) : (
        items.map((professional) => {
          const hasReviews = professional.reviewCount > 0;
          const formattedRating =
            professional.averageRating !== null
              ? professional.averageRating.toFixed(1)
              : '--';

          return (
            <LiquidGlassView
              key={professional.professionalId}
              variant="card"
              elevated
              style={{ borderRadius: radius.lg }}
              contentStyle={{ padding: spacing[4], gap: spacing[3] }}
            >
              {/* Linha Superior: Nome do Profissional */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.full,
                      backgroundColor: colors.surface.elevated,
                      borderColor: colors.border.subtle,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person" size={20} color={colors.brand.primary} />
                  </View>

                  <View style={{ gap: 2 }}>
                    <Text variant="body" weight="bold" color={colors.text.primary}>
                      {professional.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <Text variant="caption" color={colors.text.muted}>
                        Barbeiro da unidade
                      </Text>
                      {professional.isActive === false ? (
                        <Badge label="Inativo na equipe" tone="warning" size="sm" />
                      ) : null}
                    </View>
                  </View>
                </View>

                {professional.isSmallSample && hasReviews ? (
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
                  {professional.averageRating !== null ? (
                    <StarRating rating={professional.averageRating} size={18} />
                  ) : null}
                  <Text variant="caption" color={colors.text.muted}>
                    ({professional.reviewCount}{' '}
                    {professional.reviewCount === 1 ? 'avaliação' : 'avaliações'})
                  </Text>
                </View>

                {!hasReviews ? (
                  <Text variant="caption" color={colors.text.muted}>
                    Sem avaliações publicadas no período
                  </Text>
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
                      professional.percentage1to2Stars > 10
                        ? colors.feedback.error
                        : colors.text.primary
                    }
                  >
                    {professional.percentage1to2Stars}%
                  </Text>
                </Text>

                {hasReviews ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver avaliações de ${professional.name}`}
                    onPress={() =>
                      onSelectProfessionalToFilter(professional.professionalId)
                    }
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
            accessibilityLabel="Página anterior de profissionais"
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
            accessibilityLabel="Próxima página de profissionais"
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
