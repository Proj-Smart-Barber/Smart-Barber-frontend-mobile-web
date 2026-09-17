import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Card, Text } from '@/shared/ui';
import type { AgendaBooking } from '../api/agenda.contract';
import { formatClockRange, formatDurationMinutes, minutesBetween } from '../model/agenda.helpers';
import { AgendaActionButton } from './AgendaActionButton';
import { confirmDestructiveAction } from './confirm-destructive-action';

interface AgendaSimpleBookingRowProps {
  booking: AgendaBooking;
  onCancel?: () => void;
  isCancelling?: boolean;
  cancelError?: string | null;
}

/** Horário reservado (agenda simples): intervalo e duração, sem dados do cliente. */
export function AgendaSimpleBookingRow({
  booking,
  onCancel,
  isCancelling = false,
  cancelError = null,
}: AgendaSimpleBookingRowProps) {
  const { colors, spacing, radius } = useTheme();
  const duration = minutesBetween(booking.startTime, booking.endTime);

  const handleCancel = async () => {
    if (!onCancel || isCancelling) return;

    const confirmed = await confirmDestructiveAction({
      title: 'Cancelar agendamento',
      message: `O horário de ${booking.startTime} às ${booking.endTime} será cancelado. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Manter',
    });

    if (confirmed) {
      onCancel();
    }
  };

  return (
    <Card style={{ padding: spacing[4], width: '100%', gap: spacing[3] }}>
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
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="subhead" color={colors.text.primary} numberOfLines={1}>
            {formatClockRange(booking.startTime, booking.endTime)}
          </Text>
          <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
            Horário reservado · {formatDurationMinutes(duration)}
          </Text>
        </View>
      </View>

      {onCancel ? (
        <View
          style={{
            gap: spacing[2],
            borderTopWidth: 1,
            borderTopColor: colors.border.subtle,
            paddingTop: spacing[3],
          }}
        >
          {cancelError ? (
            <Text variant="caption" color={colors.feedback.error}>
              {cancelError}
            </Text>
          ) : null}

          <AgendaActionButton
            title="Cancelar agendamento"
            tone="destructive"
            loading={isCancelling}
            disabled={isCancelling}
            onPress={() => {
              void handleCancel();
            }}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
      ) : null}
    </Card>
  );
}
