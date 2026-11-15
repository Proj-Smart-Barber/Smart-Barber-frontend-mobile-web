import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Badge, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import { StarRating } from '../StarRating';
import { useOwnerProfessionalMetrics } from '../../model/use-owner-reviews';
import type { ReviewSourceDto } from '../../api/owner-reviews.types';

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

  const { data, isLoading } = useOwnerProfessionalMetrics(shopId, {
    source,
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <View style={{ gap: spacing[3] }}>
        <Skeleton width="100%" height={80} />
        <Skeleton width="100%" height={80} />
      </View>
    );
  }

  const items = data?.items ?? [];

  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="subhead" weight="bold" color={colors.text.primary}>
        Profissionais ({items.length})
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
                    <Text variant="caption" color={colors.text.muted}>
                      Barbeiro da unidade
                    </Text>
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
    </View>
  );
}
