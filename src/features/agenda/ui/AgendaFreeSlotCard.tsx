import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Card, Text } from '@/shared/ui';
import type { AgendaFreeSlotEntry } from '../api/agenda.contract';
import { formatClockRange, formatDurationMinutes, minutesBetween } from '../model/agenda.helpers';

interface AgendaFreeSlotCardProps {
  entry: AgendaFreeSlotEntry;
}

/** Horário livre: borda tracejada, ícone de relógio e duração disponível. */
export function AgendaFreeSlotCard({ entry }: AgendaFreeSlotCardProps) {
  const { colors, spacing, radius } = useTheme();
  const duration = minutesBetween(entry.startTime, entry.endTime);

  return (
    <Card
      style={{
        padding: spacing[4],
        width: '100%',
        borderWidth: 1.5,
        borderColor: colors.border.default,
        borderStyle: 'dashed',
      }}
    >
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
          <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subhead" color={colors.text.primary}>
            Livre
          </Text>
          <Text variant="caption" color={colors.text.secondary}>
            {formatClockRange(entry.startTime, entry.endTime)} ·{' '}
            {formatDurationMinutes(duration)} disponíveis
          </Text>
        </View>
      </View>
    </Card>
  );
}
