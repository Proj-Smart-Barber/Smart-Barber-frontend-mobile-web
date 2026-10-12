import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { formatCurrency, formatDurationMinutes, minutesBetween } from '@/features/agenda';
import type { BookingDetails } from '../api/bookings.contract';

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

interface BookingManageCardProps {
  booking: BookingDetails;
  onEdit: () => void;
  onCancel: () => void;
  isEditing?: boolean;
  isCancelling?: boolean;
  cancelError?: string | null;
}

/**
 * Atendimento confirmado do dia: horário, cliente, serviços (título,
 * duração e preço) e contato via WhatsApp, com ações de remarcar e
 * cancelar (confirmação obrigatória).
 */
export function BookingManageCard({
  booking,
  onEdit,
  onCancel,
  isEditing = false,
  isCancelling = false,
  cancelError = null,
}: BookingManageCardProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  const { customer, services } = booking;
  const durationMinutes = minutesBetween(booking.startTime, booking.endTime);
  const hasPhone = customer.phoneNumber.replace(/\D/g, '').length > 0;
  const isBusy = isEditing || isCancelling;

  const serviceTitles = services.map((service) => service.title).filter(Boolean);
  const serviceListLabel = serviceTitles.length > 0 ? serviceTitles.join(', ') : 'Atendimento';

  const handleWhatsApp = () => {
    const rawNumber = customer.phoneNumber.replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá ${customer.name}, sobre o seu horário no Smart Barber (${booking.startTime}):`,
    );
    void Linking.openURL(`https://wa.me/55${rawNumber}?text=${text}`).catch(() => {});
  };

  return (
    <LiquidGlassView
      variant="card"
      elevated
      style={{ width: '100%' }}
      contentStyle={{ padding: spacing[4], gap: spacing[3] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <TimeBlock startTime={booking.startTime} endTime={booking.endTime} />

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            variant="subhead"
            color={colors.text.primary}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {customer.name}
          </Text>
          <Text variant="caption" color={colors.text.muted} numberOfLines={2} ellipsizeMode="tail">
            {serviceListLabel}
          </Text>
          <Text variant="caption" color={colors.text.muted} numberOfLines={1} ellipsizeMode="tail">
            {formatDurationMinutes(Math.max(0, durationMinutes))}
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
                {formatDurationMinutes(service.durationInMinutes ?? 0)}
              </Text>
              <Text
                variant="caption"
                color={colors.text.primary}
                numberOfLines={1}
                style={{ flexShrink: 0 }}
              >
                {formatCurrency(service.priceInCents ?? 0)}
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

      <View
        style={{
          gap: spacing[2],
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
          paddingTop: spacing[3],
        }}
      >
        {cancelError ? (
          <Text variant="caption" color={colors.feedback.error} accessibilityRole="alert">
            {cancelError}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: isCompact ? 'column' : 'row',
            alignItems: isCompact ? 'stretch' : 'center',
            gap: spacing[2],
          }}
        >
          <Button
            variant="outline"
            title="Remarcar"
            disabled={isBusy}
            onPress={onEdit}
            style={{ flex: isCompact ? 0 : 1, minHeight: 44 }}
          />
          <Button
            variant="destructive"
            title="Cancelar"
            loadingTitle="Cancelando…"
            loading={isCancelling}
            disabled={isBusy}
            onPress={onCancel}
            style={{ flex: isCompact ? 0 : 1, minHeight: 44 }}
          />
        </View>
      </View>
    </LiquidGlassView>
  );
}
