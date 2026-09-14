import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Card, Skeleton, Text } from '@/shared/ui';
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
          gap: spacing[4],
        }}
      >
        <Card style={{ flex: 1, minHeight: 110, gap: spacing[2] }}>
          <Skeleton width={120} height={16} />
          <Skeleton width={90} height={28} />
          <Skeleton width={140} height={14} />
        </Card>
        <Card style={{ flex: 1, minHeight: 110, gap: spacing[2] }}>
          <Skeleton width={120} height={16} />
          <Skeleton width={90} height={28} />
          <Skeleton width={140} height={14} />
        </Card>
        <Card style={{ flex: 1, minHeight: 110, gap: spacing[2] }}>
          <Skeleton width={120} height={16} />
          <Skeleton width={90} height={28} />
          <Skeleton width={140} height={14} />
        </Card>
      </View>
    );
  }

  return (
    <View
      style={{
        width: '100%',
        flexDirection: isCompact ? 'column' : 'row',
        gap: spacing[4],
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
          <Card
            key={card.id}
            elevated
            style={{
              flex: 1,
              padding: spacing[5],
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
                  width: 32,
                  height: 32,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface.input,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={card.iconName as any} size={18} color={iconColor} />
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
          </Card>
        );
      })}
    </View>
  );
}
