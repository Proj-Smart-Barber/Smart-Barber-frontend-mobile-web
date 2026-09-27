import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Card, Text } from '@/shared/ui';
import type { AgendaHoldEntry } from '../api/agenda.contract';
import { formatClockRange, formatDurationMinutes, formatHoldExpiry, minutesBetween } from '../model/agenda.helpers';

interface AgendaHoldCardProps {
  entry: AgendaHoldEntry;
}

/**
 * Hold temporário (bloqueio): ícone de cadeado e expiração quando
 * fornecida. Sem exposição de dados de cliente.
 */
export function AgendaHoldCard({ entry }: AgendaHoldCardProps) {
  const { colors, spacing, radius } = useTheme();
  const duration = minutesBetween(entry.startTime, entry.endTime);
  const expiryLabel = formatHoldExpiry(entry.expiresAt);
  const isExpired = expiryLabel === 'Expirado';

  return (
    <Card style={{ padding: spacing[4], width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: colors.surface.input,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="lock-closed-outline" size={18} color={colors.text.secondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subhead" color={colors.text.primary}>
            Bloqueado
          </Text>
          <Text variant="caption" color={colors.text.secondary}>
            {formatClockRange(entry.startTime, entry.endTime)} ·{' '}
            {formatDurationMinutes(duration)} reservados
          </Text>
          {expiryLabel ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <Ionicons
                name={isExpired ? 'alert-circle' : 'hourglass-outline'}
                size={13}
                color={isExpired ? colors.feedback.error : colors.text.muted}
              />
              <Text
                variant="caption"
                color={isExpired ? colors.feedback.error : colors.text.muted}
              >
                {expiryLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
