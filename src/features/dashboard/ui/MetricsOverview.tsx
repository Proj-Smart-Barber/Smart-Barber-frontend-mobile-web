import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import type { DashboardMetricCardData } from '../model/dashboard.types';

interface MetricsOverviewProps {
  metrics: DashboardMetricCardData[];
  isLoading?: boolean;
}

export function MetricsOverview({ metrics, isLoading = false }: MetricsOverviewProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  if (isLoading) {
    return (
      <View
        style={{
          width: '100%',
          flexDirection: isCompact ? 'column' : 'row',
          gap: spacing[3],
        }}
      >
        <LiquidGlassView
          variant="card"
          elevated
          style={{ flex: 1, minHeight: 96 }}
          contentStyle={{ gap: spacing[2], padding: spacing[4] }}
        >
          <Skeleton width={120} height={16} />
          <Skeleton width={90} height={26} />
        </LiquidGlassView>
        <LiquidGlassView
          variant="card"
          elevated
          style={{ flex: 1, minHeight: 96 }}
          contentStyle={{ gap: spacing[2], padding: spacing[4] }}
        >
          <Skeleton width={120} height={16} />
          <Skeleton width={90} height={26} />
        </LiquidGlassView>
      </View>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        width: '100%',
        flexDirection: isCompact ? 'column' : 'row',
        gap: spacing[3],
      }}
    >
      {metrics.map((card) => {
        const iconColor =
          card.tone === 'brand'
            ? colors.brand.primary
            : card.tone === 'success'
              ? colors.feedback.success
              : card.tone === 'warning'
                ? colors.feedback.warning
                : colors.text.secondary;

        return (
          <LiquidGlassView
            key={card.id}
            variant="card"
            elevated
            style={{ flex: 1 }}
            contentStyle={{
              padding: spacing[4],
              gap: spacing[2],
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="caption" color={colors.text.muted}>
                {card.title}
              </Text>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface.input,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={card.iconName as any} size={16} color={iconColor} />
              </View>
            </View>

            <Text variant="display" color={colors.text.primary} weight="extraBold">
              {card.value}
            </Text>

            {card.subtitle ? (
              <Text variant="caption" color={colors.text.secondary}>
                {card.subtitle}
              </Text>
            ) : null}
          </LiquidGlassView>
        );
      })}
    </View>
  );
}
