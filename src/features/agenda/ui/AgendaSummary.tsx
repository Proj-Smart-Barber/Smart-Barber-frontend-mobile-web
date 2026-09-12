import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Card, Skeleton, Text } from '@/shared/ui';
import type { AgendaSummaryView } from '../model/agenda.types';
import { formatCurrency } from '../model/agenda.helpers';

interface AgendaSummaryProps {
  summary: AgendaSummaryView | null;
  isLoading: boolean;
}

/**
 * Resumo do dia derivado dos bookings detalhados: contagem,
 * receita prevista e próximo atendimento (quando aplicável).
 */
export function AgendaSummary({ summary, isLoading }: AgendaSummaryProps) {
  const { colors, spacing } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  if (isLoading) {
    return (
      <Card style={{ gap: spacing[3], width: '100%' }}>
        <Skeleton width={160} height={14} />
        <Skeleton width={90} height={24} />
        <Skeleton width="60%" height={14} />
      </Card>
    );
  }

  if (!summary) return null;

  return (
    <Card style={{ gap: spacing[4], width: '100%' }}>
      <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: spacing[4] }}>
        <View style={{ flex: 1, gap: spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
            <Text variant="caption" color={colors.text.secondary}>
              Agendamentos do dia
            </Text>
          </View>
          <Text variant="price" color={colors.text.primary}>
            {summary.bookingsCount}
          </Text>
        </View>

        <View style={{ flex: 1, gap: spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Ionicons name="cash-outline" size={16} color={colors.text.secondary} />
            <Text variant="caption" color={colors.text.secondary}>
              Receita prevista
            </Text>
          </View>
          <Text variant="price" color={colors.text.primary}>
            {formatCurrency(summary.revenueInCents)}
          </Text>
        </View>
      </View>

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
          <Text
            variant="subhead"
            color={colors.text.primary}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {summary.next.startTime} · {summary.next.customerName}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
