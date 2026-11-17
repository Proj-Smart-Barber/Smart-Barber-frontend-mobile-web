import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import type {
  ReviewTimeSeriesGranularityDto,
  ReviewTimeSeriesPointDto,
} from '../../api/owner-reviews.types';

interface ReviewTimeSeriesCardProps {
  timeSeries: ReviewTimeSeriesPointDto[];
  granularity: ReviewTimeSeriesGranularityDto;
  onSelectGranularity: (granularity: ReviewTimeSeriesGranularityDto) => void;
}

export function ReviewTimeSeriesCard({
  timeSeries,
  granularity,
  onSelectGranularity,
}: ReviewTimeSeriesCardProps) {
  const { colors, spacing, radius, isDark } = useTheme();

  return (
    <LiquidGlassView
      variant="card"
      elevated
      style={{ borderRadius: radius.lg }}
      contentStyle={{ padding: spacing[4], gap: spacing[3] }}
    >
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
          <Text variant="caption" weight="bold" color={colors.text.muted}>
            EVOLUÇÃO NO PERÍODO
          </Text>
          <Text variant="caption" color={colors.text.secondary}>
            Média e volume de avaliações recebidas por intervalo
          </Text>
        </View>

        <View style={styles.segmentContainer}>
          {(
            [
              { label: 'Semanal', value: 'WEEK' },
              { label: 'Mensal', value: 'MONTH' },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityLabel={`Agrupar evolução ${opt.label.toLowerCase()}`}
              onPress={() => onSelectGranularity(opt.value)}
              style={[
                styles.segmentButton,
                granularity === opt.value && {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(0, 0, 0, 0.12)',
                },
              ]}
            >
              <Text
                variant="caption"
                weight={granularity === opt.value ? 'bold' : 'regular'}
                color={
                  granularity === opt.value
                    ? colors.text.primary
                    : colors.text.muted
                }
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {timeSeries.length === 0 ? (
        <Text variant="caption" color={colors.text.muted}>
          Sem intervalos no período selecionado.
        </Text>
      ) : (
        <View style={{ gap: spacing[2] }}>
          {timeSeries.map((point) => {
            const hasData = point.reviewCount > 0 && point.averageRating !== null;
            const fillPct = hasData
              ? Math.min(100, Math.max(0, ((point.averageRating ?? 0) / 5) * 100))
              : 0;

            return (
              <View key={point.bucketStart} style={{ gap: 4 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text variant="caption" color={colors.text.secondary}>
                    {point.label}
                  </Text>
                  <Text variant="caption" color={colors.text.primary} weight="bold">
                    {hasData
                      ? `${point.averageRating?.toFixed(1)} ★ (${point.reviewCount})`
                      : 'Sem avaliações'}
                  </Text>
                </View>

                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
                    overflow: 'hidden',
                  }}
                >
                  {hasData ? (
                    <View
                      style={{
                        height: '100%',
                        width: `${fillPct}%`,
                        backgroundColor: colors.brand.primary,
                        borderRadius: 3,
                      }}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  segmentButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
