import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Card, Text } from '@/shared/ui';
import type { AgendaBookingDetails } from '../api/agenda.contract';
import { formatCurrency, formatDurationMinutes, minutesBetween } from '../model/agenda.helpers';
import { AgendaActionButton } from './AgendaActionButton';
import { confirmDestructiveAction } from './confirm-destructive-action';

/** Coluna de horário com largura fixa; valores nunca quebram em linha. */
function TimeBlock({ startTime, endTime }: { startTime: string; endTime: string }) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      style={{
        width: 64,
        flexShrink: 0,
        paddingVertical: spacing[2],
        borderRadius: radius.md,
        backgroundColor: colors.surface.input,
        borderLeftWidth: 3,
        borderLeftColor: colors.brand.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <Text variant="subhead" color={colors.text.primary} weight="bold" numberOfLines={1}>
        {startTime}
      </Text>
      <Text variant="caption" color={colors.text.muted} numberOfLines={1}>
        {endTime}
      </Text>
    </View>
  );
}

interface AgendaBookingCardProps {
  booking: AgendaBookingDetails;
  onCancel?: () => void;
  isCancelling?: boolean;
  cancelError?: string | null;
}

/**
 * Agendamento da agenda detalhada: horário, cliente, serviços
 * (título, duração e preço) e contato via WhatsApp, com ação de
 * cancelamento (confirmação obrigatória).
 *
 * No mobile, nomes com mais de 15 caracteres reduzem a fonte para
 * caberem integralmente, sem reticências.
 */
export function AgendaBookingCard({
  booking,
  onCancel,
  isCancelling = false,
  cancelError = null,
}: AgendaBookingCardProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  const { customer, services } = booking;
  const isLongName = customer.name.length > 15;
  const shouldShrinkName = isCompact && isLongName;
  const durationMinutes = minutesBetween(booking.startTime, booking.endTime);
  const hasPhone = customer.phoneNumber.replace(/\D/g, '').length > 0;

  const handleWhatsApp = () => {
    const rawNumber = customer.phoneNumber.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá ${customer.name}, sobre o seu horário no Smart Barber (${booking.startTime}):`,
    );
    void Linking.openURL(`https://wa.me/55${rawNumber}?text=${text}`).catch(() => {});
  };

  const handleCancel = async () => {
    if (!onCancel || isCancelling) return;

    const confirmed = await confirmDestructiveAction({
      title: 'Cancelar agendamento',
      message: `O horário de ${booking.startTime} de ${customer.name} será cancelado. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Manter',
    });

    if (confirmed) {
      onCancel();
    }
  };

  return (
    <Card style={{ padding: spacing[4], gap: spacing[3], width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <TimeBlock startTime={booking.startTime} endTime={booking.endTime} />

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            variant="subhead"
            color={colors.text.primary}
            numberOfLines={shouldShrinkName ? undefined : 2}
            ellipsizeMode={shouldShrinkName ? undefined : 'tail'}
            style={shouldShrinkName ? { fontSize: 14, lineHeight: 19 } : undefined}
          >
            {customer.name}
          </Text>
          <Text variant="caption" color={colors.text.muted} numberOfLines={1} ellipsizeMode="tail">
            {formatDurationMinutes(durationMinutes)}
            {hasPhone ? ` · ${customer.phoneNumber}` : ''}
          </Text>
        </View>
      </View>

      {services.length > 0 ? (
        <View
          style={{
            gap: spacing[2],
            borderTopWidth: 1,
            borderTopColor: colors.border.subtle,
            paddingTop: spacing[3],
          }}
        >
          {services.map((service) => (
            <View
              key={service.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
            >
              <Text
                variant="caption"
                color={colors.text.secondary}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ flex: 1, minWidth: 0 }}
              >
                {service.title}
              </Text>
              <Text
                variant="caption"
                color={colors.text.muted}
                numberOfLines={1}
                style={{ flexShrink: 0 }}
              >
                {formatDurationMinutes(service.durationInMinutes)}
              </Text>
              <Text
                variant="caption"
                color={colors.text.primary}
                numberOfLines={1}
                style={{ flexShrink: 0 }}
              >
                {formatCurrency(service.priceInCents)}
              </Text>
            </View>
          ))}

          {hasPhone ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Enviar WhatsApp para ${customer.name}`}
              onPress={handleWhatsApp}
              style={({ pressed }) => ({
                alignSelf: 'flex-start',
                minHeight: 36,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[2],
                marginTop: spacing[1],
                paddingHorizontal: spacing[3],
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: colors.border.default,
                backgroundColor: pressed ? colors.surface.selected : 'transparent',
              })}
            >
              <Ionicons name="logo-whatsapp" size={14} color={colors.feedback.success} />
              <Text variant="caption" color={colors.text.primary}>
                WhatsApp
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
