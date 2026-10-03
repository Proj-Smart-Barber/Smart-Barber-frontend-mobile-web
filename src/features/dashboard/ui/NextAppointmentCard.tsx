import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Button, Skeleton, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation';
import { confirmDestructiveAction } from '@/features/agenda/ui/confirm-destructive-action';
import type { AppointmentStatus, DashboardAppointment } from '../api/dashboard.contract';
import { formatCurrency, mapStatusBadgeTone, mapStatusLabel } from '../model/dashboard.helpers';

interface NextAppointmentCardProps {
  appointment: DashboardAppointment | null;
  isLoading?: boolean;
  isUpdating?: boolean;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
}

export function NextAppointmentCard({
  appointment,
  isLoading = false,
  isUpdating = false,
  onUpdateStatus,
}: NextAppointmentCardProps) {
  const router = useRouter();
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  if (isLoading) {
    return (
      <LiquidGlassView
        variant="card"
        elevated
        style={{ width: '100%' }}
        contentStyle={{ gap: spacing[4], padding: spacing[5] }}
      >
        <Skeleton width={160} height={20} />
        <Skeleton width="100%" height={32} />
        <Skeleton width={140} height={18} />
      </LiquidGlassView>
    );
  }

  if (!appointment) {
    return (
      <LiquidGlassView
        variant="card"
        elevated
        style={{ width: '100%' }}
        contentStyle={{
          padding: spacing[5],
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[2],
        }}
        borderColor={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'}
      >
        <Ionicons name="calendar-outline" size={32} color={colors.text.muted} />
        <Text variant="subhead" weight="bold" color={colors.text.primary} align="center">
          Nenhum agendamento pendente no momento
        </Text>
        <Text variant="bodySm" color={colors.text.secondary} align="center">
          Não há atendimentos na fila imediata para este turno. Consulte a agenda para conferir outros horários.
        </Text>
      </LiquidGlassView>
    );
  }

  const handleOpenAgenda = () => {
    router.push('/(app)/agenda' as any);
  };

  const handleCancel = async () => {
    const confirmed = await confirmDestructiveAction({
      title: 'Cancelar agendamento',
      message: `Deseja realmente cancelar o agendamento de ${appointment.customerName} às ${appointment.scheduledTime}?`,
      confirmLabel: 'Sim, cancelar',
      cancelLabel: 'Manter',
    });

    if (confirmed) {
      onUpdateStatus(appointment.id, 'CANCELLED');
    }
  };

  const handleWhatsApp = () => {
    const rawNumber = (appointment.customerPhone || '').replace(/\D/g, '');
    if (!rawNumber) return;
    const url = `https://wa.me/55${rawNumber}?text=Ol%C3%A1%20${encodeURIComponent(appointment.customerName)},%20seu%20hor%C3%A1rio%20no%20Smart%20Barber%20est%C3%A1%20confirmado!`;
    void Linking.openURL(url).catch(() => {});
  };

  const isInService = appointment.status === 'IN_SERVICE';

  return (
    <LiquidGlassView
      variant="card"
      elevated
      style={{ width: '100%' }}
      contentStyle={{
        padding: spacing[5],
        gap: spacing[4],
      }}
      borderWidth={isInService ? 1.5 : 1}
      borderColor={isInService ? colors.brand.primary : undefined}
    >
      {/* Topo do Destaque: Título da Seção + Horário + Status */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[2],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[1],
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.md,
              backgroundColor: colors.surface.input,
            }}
          >
            <Ionicons name="time-outline" size={16} color={colors.text.primary} />
            <Text variant="subhead" color={colors.text.primary} weight="bold">
              {appointment.scheduledTime}
            </Text>
          </View>
          <Text variant="caption" color={colors.text.muted}>
            ({appointment.durationMinutes} min)
          </Text>
        </View>

        <Badge
          label={mapStatusLabel(appointment.status)}
          tone={mapStatusBadgeTone(appointment.status)}
          style={{ flexShrink: 0 }}
        />
      </View>

      {/* Conteúdo Central: Cliente, Serviço e Preço */}
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isCompact ? 'flex-start' : 'center',
          gap: spacing[3],
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
          <Text variant="h2" color={colors.text.primary} numberOfLines={2} ellipsizeMode="tail">
            {appointment.customerName}
          </Text>
          <Text variant="body" color={colors.text.secondary} numberOfLines={2} ellipsizeMode="tail">
            {appointment.serviceTitle} · Barbeiro: {appointment.barbermanName}
          </Text>
        </View>

        <Text variant="subhead" color={colors.text.brand} weight="bold" style={{ flexShrink: 0 }}>
          {formatCurrency(appointment.servicePriceInCents)}
        </Text>
      </View>

      {/* Ações Rápidas: Ver na Agenda como ação primária clara */}
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          alignItems: isCompact ? 'stretch' : 'center',
          gap: spacing[2],
          paddingTop: spacing[2],
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
        }}
      >
        <Button
          title="Ver na Agenda"
          variant="primary"
          leftIcon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
          onPress={handleOpenAgenda}
          style={{ flex: isCompact ? undefined : 1, minHeight: 48, width: isCompact ? '100%' : undefined }}
        />

        {isCompact ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], width: '100%' }}>
            {appointment.customerPhone ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Enviar WhatsApp para ${appointment.customerName}`}
                onPress={handleWhatsApp}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    flex: 1,
                    borderRadius: radius.md,
                    borderColor: colors.border.default,
                    backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                  },
                ]}
              >
                <Ionicons name="logo-whatsapp" size={18} color={colors.feedback.success} />
                <Text variant="bodySm" color={colors.text.primary} weight="medium">
                  WhatsApp
                </Text>
              </Pressable>
            ) : null}

            <Button
              title="Cancelar"
              variant="outline"
              loading={isUpdating}
              disabled={isUpdating}
              leftIcon={<Ionicons name="close-circle-outline" size={18} color={colors.feedback.error} />}
              textStyle={{ color: colors.feedback.error }}
              onPress={() => void handleCancel()}
              style={{
                flex: 1,
                minHeight: 48,
                borderColor: colors.feedback.error,
              }}
            />
          </View>
        ) : (
          <>
            {appointment.customerPhone ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Enviar WhatsApp para ${appointment.customerName}`}
                onPress={handleWhatsApp}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  {
                    borderRadius: radius.md,
                    borderColor: colors.border.default,
                    backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                  },
                ]}
              >
                <Ionicons name="logo-whatsapp" size={18} color={colors.feedback.success} />
                <Text variant="bodySm" color={colors.text.primary} weight="medium">
                  WhatsApp
                </Text>
              </Pressable>
            ) : null}

            <Button
              title="Cancelar"
              variant="outline"
              loading={isUpdating}
              disabled={isUpdating}
              leftIcon={<Ionicons name="close-circle-outline" size={18} color={colors.feedback.error} />}
              textStyle={{ color: colors.feedback.error }}
              onPress={() => void handleCancel()}
              style={{
                minHeight: 48,
                borderColor: colors.feedback.error,
              }}
            />
          </>
        )}
      </View>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  secondaryButton: {
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
