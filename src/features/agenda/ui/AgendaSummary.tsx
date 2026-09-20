import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Card, Skeleton, Text } from '@/shared/ui';
import type { AgendaSummaryView } from '../model/agenda.types';

interface AgendaSummaryProps {
  summary: AgendaSummaryView | null;
  isLoading: boolean;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Resumo do dia: ocupação e próximo atendimento.
 * Renderizado somente quando o contrato fornece os dados.
 */
export function AgendaSummary({ summary, isLoading }: AgendaSummaryProps) {
  const { colors, spacing, radius } = useTheme();

  if (isLoading) {
    return (
      <Card style={{ gap: spacing[3], width: '100%' }}>
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={24} />
        <Skeleton width="60%" height={14} />
      </Card>
    );
  }

  if (!summary) return null;

  const showOccupancy = summary.occupancyPercent !== null && summary.occupancyLabel !== null;
  const showNext = summary.next !== null;

  if (!showOccupancy && !showNext) return null;

  return (
    <Card style={{ gap: spacing[4], width: '100%' }}>
      {showOccupancy && summary.occupancyPercent !== null ? (
        <View style={{ gap: spacing[2] }}>
          <Text variant="caption" color={colors.text.secondary}>
            Ocupação do dia
          </Text>
          <Text variant="price" color={colors.text.primary}>
            {summary.occupancyLabel}
          </Text>
          <View
            accessibilityLabel={`Ocupação de ${summary.occupancyPercent} por cento`}
            style={{
              height: 8,
              borderRadius: radius.full,
              backgroundColor: colors.surface.input,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 8,
                borderRadius: radius.full,
                backgroundColor: colors.brand.primary,
                width: `${clampPercent(summary.occupancyPercent)}%`,
              }}
            />
          </View>
          {summary.occupancyDetail ? (
            <Text variant="caption" color={colors.text.muted}>
              {summary.occupancyDetail}
            </Text>
          ) : null}
        </View>
      ) : null}

      {summary.next ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border.subtle,
            paddingTop: spacing[3],
            gap: spacing[1],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
            <Text variant="caption" color={colors.text.secondary}>
              Próximo atendimento
            </Text>
          </View>
          <Text variant="subhead" color={colors.text.primary}>
            {summary.next.startTime} · {summary.next.serviceTitle}
          </Text>
          <Text variant="caption" color={colors.text.muted}>
            {summary.next.customerName} · {summary.next.professionalName}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
