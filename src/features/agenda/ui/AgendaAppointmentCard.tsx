import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mapStatusBadgeTone, mapStatusLabel } from '@/entities/appointment';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Card, Text } from '@/shared/ui';
import type { AgendaAppointmentEntry } from '../api/agenda.contract';
import { mapPaymentStatusLabel } from '../model/agenda.helpers';

function statusToneColor(
  tone: ReturnType<typeof mapStatusBadgeTone>,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (tone) {
    case 'success':
      return colors.feedback.success;
    case 'successAlt':
      return colors.feedback.successAlt;
    case 'info':
      return colors.feedback.info;
    case 'warning':
      return colors.feedback.warning;
    case 'error':
      return colors.feedback.error;
    default:
      return colors.brand.primary;
  }
}

/** Coluna de horário com largura fixa; valores nunca quebram em linha. */
function TimeBlock({ entry }: { entry: AgendaAppointmentEntry }) {
  const { colors, spacing, radius } = useTheme();
  const tone = mapStatusBadgeTone(entry.status);

  return (
    <View
      style={{
        width: 64,
        flexShrink: 0,
        paddingVertical: spacing[2],
        borderRadius: radius.md,
        backgroundColor: colors.surface.input,
        borderLeftWidth: 3,
        borderLeftColor: statusToneColor(tone, colors),
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Text variant="subhead" color={colors.text.primary} weight="bold" numberOfLines={1}>
        {entry.startTime}
      </Text>
      <Text variant="caption" color={colors.text.muted} numberOfLines={1}>
        {entry.endTime}
      </Text>
    </View>
  );
}

/** Chips de pagamento / check-in / conflito; quebram por linha, nunca por palavra. */
function MetaChips({
  entry,
  paymentLabel,
  gap,
}: {
  entry: AgendaAppointmentEntry;
  paymentLabel: string | null;
  gap: number;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap }}>
      {paymentLabel ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
          <Ionicons name="card-outline" size={14} color={colors.text.secondary} />
          <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
            {paymentLabel}
          </Text>
        </View>
      ) : null}
      {entry.checkedInAt ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
          <Ionicons name="checkmark-circle" size={14} color={colors.feedback.success} />
          <Text variant="caption" color={colors.feedback.success} numberOfLines={1}>
            Check-in às {entry.checkedInAt}
          </Text>
        </View>
      ) : null}
      {entry.hasConflict ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
          <Ionicons name="warning" size={14} color={colors.feedback.warning} />
          <Text variant="caption" color={colors.feedback.warning} numberOfLines={1}>
            Conflito de horário
          </Text>
        </View>
      ) : null}
    </View>
  );
}

interface AgendaAppointmentCardProps {
  entry: AgendaAppointmentEntry;
}

/**
 * Agendamento confirmado: horário, cliente, serviço, profissional,
 * status e pagamento (somente quando presentes no contrato).
 *
 * No mobile (compact) os dados secundários (serviço, profissional,
 * pagamento) são reorganizados em uma seção abaixo do cabeçalho,
 * com truncamento em até duas linhas, para manter o card compacto.
 */
export function AgendaAppointmentCard({ entry }: AgendaAppointmentCardProps) {
  const { colors, spacing } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const tone = mapStatusBadgeTone(entry.status);
  const priceValue =
    entry.servicePriceInCents !== null
      ? (entry.servicePriceInCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : null;
  const paymentLabel = entry.paymentStatus ? mapPaymentStatusLabel(entry.paymentStatus) : null;
  const showChips = Boolean(paymentLabel || entry.checkedInAt || entry.hasConflict);
  const isLongName = entry.customerName.length > 15;

  return (
    <Card style={{ padding: spacing[4], gap: spacing[3], width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <TimeBlock entry={entry} />

        {isCompact ? (
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              variant="subhead"
              color={colors.text.primary}
              numberOfLines={isLongName ? undefined : 2}
              ellipsizeMode={isLongName ? undefined : 'tail'}
              style={isLongName ? { fontSize: 14, lineHeight: 19 } : undefined}
            >
              {entry.customerName}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              variant="subhead"
              color={colors.text.primary}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {entry.customerName}
            </Text>
            <Text
              variant="caption"
              color={colors.text.secondary}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {entry.serviceTitle}
              {priceValue ? ` · ${priceValue}` : ''}
            </Text>
            <Text
              variant="caption"
              color={colors.text.muted}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Profissional: {entry.professionalName}
            </Text>
          </View>
        )}

        <View style={{ flexShrink: 0 }}>
          <Badge label={mapStatusLabel(entry.status)} tone={tone} />
        </View>
      </View>

      {isCompact ? (
        <View
          style={{
            gap: spacing[2],
            borderTopWidth: 1,
            borderTopColor: colors.border.subtle,
            paddingTop: spacing[2],
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Text
              variant="caption"
              color={colors.text.secondary}
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{ flex: 1, minWidth: 0 }}
            >
              {entry.serviceTitle}
            </Text>
            {priceValue ? (
              <Text
                variant="caption"
                color={colors.text.primary}
                numberOfLines={1}
                style={{ flexShrink: 0 }}
              >
                {priceValue}
              </Text>
            ) : null}
          </View>
          <Text
            variant="caption"
            color={colors.text.muted}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Profissional: {entry.professionalName}
          </Text>
          {showChips ? (
            <MetaChips entry={entry} paymentLabel={paymentLabel} gap={spacing[2]} />
          ) : null}
        </View>
      ) : showChips ? (
        <MetaChips entry={entry} paymentLabel={paymentLabel} gap={spacing[3]} />
      ) : null}
    </Card>
  );
}
