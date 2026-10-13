import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mapStatusBadgeTone, mapStatusLabel } from '@/entities/appointment';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { serverClock } from '@/features/bookings';
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

function TimeBlock({ entry }: { entry: AgendaAppointmentEntry }) {
  const { colors, spacing, radius } = useTheme();
  const tone = mapStatusBadgeTone(entry.status);

  return (
    <View
      style={{
        width: 68,
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

export interface AgendaAppointmentCardProps {
  entry: AgendaAppointmentEntry;
  onSelect?: (id: string) => void;
  onCancel?: (id: string) => void;
  onReschedule?: (booking: any) => void;
  onComplete?: (booking: any) => void;
  onNoShow?: (booking: any) => void;
  isCancelling?: boolean;
}

export function AgendaAppointmentCard({
  entry,
  onSelect,
  onCancel,
  onReschedule,
  onComplete,
  onNoShow,
  isCancelling = false,
}: AgendaAppointmentCardProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);

  const tone = mapStatusBadgeTone(entry.status);
  const paymentLabel = entry.paymentStatus ? mapPaymentStatusLabel(entry.paymentStatus) : null;
  const showChips = Boolean(paymentLabel || entry.checkedInAt || entry.hasConflict);

  const priceValue =
    typeof entry.servicePriceInCents === 'number' && entry.servicePriceInCents > 0
      ? (entry.servicePriceInCents / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : null;

  // Capabilities da reserva exigem autorização estrita (allowed === true), versão válida e relógio sincronizado
  const isClockValid = serverClock.hasValidReference();
  const hasValidVersion = typeof (entry.version ?? entry.rawBooking?.version) === 'number';

  const canCancel =
    isClockValid &&
    hasValidVersion &&
    entry.capabilities?.cancel?.allowed === true &&
    entry.status !== 'CANCELLED' &&
    entry.status !== 'COMPLETED' &&
    entry.status !== 'NO_SHOW';

  const canReschedule =
    isClockValid &&
    hasValidVersion &&
    entry.capabilities?.reschedule?.allowed === true &&
    entry.status !== 'CANCELLED' &&
    entry.status !== 'COMPLETED' &&
    entry.status !== 'NO_SHOW';

  const canComplete =
    isClockValid &&
    hasValidVersion &&
    entry.capabilities?.complete?.allowed === true &&
    (entry.status === 'CONFIRMED' || entry.status === 'IN_SERVICE');

  const canNoShow =
    isClockValid &&
    hasValidVersion &&
    entry.capabilities?.noShow?.allowed === true &&
    entry.status === 'CONFIRMED';

  const handleOpenDetail = () => {
    if (onSelect) {
      onSelect(entry.id);
    }
  };

  const handleReschedule = () => {
    if (onReschedule && entry.rawBooking) {
      onReschedule(entry.rawBooking);
    } else {
      router.push({
        pathname: `/(account)/bookings/${entry.id}/reschedule` as any,
        params: { scope: 'UNIT' },
      });
    }
  };

  return (
    <LiquidGlassView
      variant="card"
      elevated
      borderRadius={radius.lg}
      borderColor={isFocused ? colors.border.focus : undefined}
      borderWidth={isFocused ? 2 : 1}
      style={{ width: '100%' }}
      contentStyle={{
        gap: spacing[3],
        padding: isCompact ? spacing[3] : spacing[4],
      }}
    >
      {/* Linha principal com TimeBlock e informações do cliente */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Agendamento das ${entry.startTime} às ${entry.endTime}, cliente ${entry.customerName}`}
        accessibilityHint="Toque para ver os detalhes completos deste agendamento"
        onPress={handleOpenDetail}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <TimeBlock entry={entry} />

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            variant="body"
            weight="bold"
            color={colors.text.primary}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {entry.customerName}
          </Text>

          <Text
            variant="caption"
            color={colors.text.secondary}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {entry.serviceTitle}
          </Text>

          {entry.professionalName ? (
            <Text
              variant="caption"
              color={colors.text.muted}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Profissional: {entry.professionalName}
            </Text>
          ) : null}
        </View>

        <View style={{ flexShrink: 0, alignItems: 'flex-end', gap: spacing[1] }}>
          <Badge label={mapStatusLabel(entry.status)} tone={tone} />
          {priceValue ? (
            <Text variant="caption" weight="bold" color={colors.text.primary} numberOfLines={1}>
              {priceValue}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {/* Chips adicionais se houver */}
      {showChips ? (
        <MetaChips entry={entry} paymentLabel={paymentLabel} gap={spacing[2]} />
      ) : null}

      {/* Barra de ações acessíveis */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          paddingTop: spacing[2],
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: spacing[2],
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver detalhes do agendamento"
          onPress={handleOpenDetail}
          style={({ pressed }) => ({
            minHeight: 36,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1],
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
            justifyContent: 'center',
            alignItems: 'center',
          })}
        >
          <Text variant="caption" weight="bold" color={colors.text.primary}>
            Detalhes
          </Text>
        </Pressable>

        {canReschedule ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remarcar agendamento"
            onPress={handleReschedule}
            style={({ pressed }) => ({
              minHeight: 36,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            <Text variant="caption" weight="bold" color={colors.brand.primary}>
              Remarcar
            </Text>
          </Pressable>
        ) : null}

        {canComplete && onComplete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Concluir atendimento"
            onPress={() => onComplete(entry.rawBooking)}
            style={({ pressed }) => ({
              minHeight: 36,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.feedback.successAlt : colors.feedback.success,
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            <Text variant="caption" weight="bold" color="#FFFFFF">
              Concluir
            </Text>
          </Pressable>
        ) : null}

        {canNoShow && onNoShow ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Registrar não comparecimento"
            onPress={() => onNoShow(entry.rawBooking)}
            style={({ pressed }) => ({
              minHeight: 36,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            <Text variant="caption" weight="bold" color={colors.feedback.warning}>
              Não compareceu
            </Text>
          </Pressable>
        ) : null}

        {canCancel && onCancel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar agendamento"
            disabled={isCancelling}
            onPress={() => onCancel(entry.id)}
            style={({ pressed }) => ({
              minHeight: 36,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surface.selected : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isCancelling ? 0.5 : 1,
            })}
          >
            <Text variant="caption" weight="bold" color={colors.feedback.error}>
              {isCancelling ? 'Cancelando…' : 'Cancelar'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </LiquidGlassView>
  );
}
