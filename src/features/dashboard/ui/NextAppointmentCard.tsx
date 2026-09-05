import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Button, Card, Skeleton, Text } from '@/shared/ui';
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
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  if (isLoading) {
    return (
      <Card elevated style={{ width: '100%', gap: spacing[4], padding: spacing[6] }}>
        <Skeleton width={180} height={20} />
        <Skeleton width="100%" height={32} />
        <Skeleton width={140} height={18} />
      </Card>
    );
  }

  if (!appointment) {
    return (
      <Card
        style={{
          width: '100%',
          padding: spacing[6],
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[2],
          borderStyle: 'dashed',
        }}
      >
        <Ionicons name="checkmark-circle-outline" size={36} color={colors.feedback.success} />
        <Text variant="subhead" color={colors.text.primary} align="center">
          Nenhum atendimento na fila
        </Text>
        <Text variant="bodySm" color={colors.text.secondary} align="center">
          Todos os cortes agendados para este turno foram concluídos ou você está livre no momento.
        </Text>
      </Card>
    );
  }

  const isInService = appointment.status === 'IN_SERVICE';

  const handleWhatsApp = () => {
    const rawNumber = appointment.customerPhone.replace(/\D/g, '');
    const url = `https://wa.me/55${rawNumber}?text=Ol%C3%A1%20${encodeURIComponent(appointment.customerName)},%20seu%20hor%C3%A1rio%20no%20Smart%20Barber%20est%C3%A1%20confirmado!`;
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <Card
      elevated
      style={{
        width: '100%',
        padding: spacing[6],
        gap: spacing[4],
        borderWidth: isInService ? 1.5 : 1,
        borderColor: isInService ? colors.brand.primary : colors.border.subtle,
      }}
    >
      {/* Topo do Card: Badge de Horário e Status */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
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
        />
      </View>

      {/* Conteúdo Central: Cliente e Serviço */}
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isCompact ? 'flex-start' : 'center',
          gap: spacing[3],
        }}
      >
        <View style={{ gap: spacing[1] }}>
          <Text variant="h1" color={colors.text.primary}>
            {appointment.customerName}
          </Text>
          <Text variant="body" color={colors.text.secondary}>
            {appointment.serviceTitle} · Barbeiro: {appointment.barbermanName}
          </Text>
        </View>

        <Text variant="subhead" color={colors.brand.primary} weight="bold">
          {formatCurrency(appointment.servicePriceInCents)}
        </Text>
      </View>

      {/* Ações Rápidas do Atendimento */}
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingTop: spacing[2],
          borderTopWidth: 1,
          borderTopColor: colors.border.subtle,
        }}
      >
        {isInService ? (
          <Button
            title="Concluir Atendimento"
            variant="primary"
            loading={isUpdating}
            leftIcon={<Ionicons name="checkmark-done" size={18} color={colors.text.inverse} />}
            onPress={() => onUpdateStatus(appointment.id, 'COMPLETED')}
            style={{ flex: 1, minHeight: 48 }}
          />
        ) : (
          <Button
            title="Iniciar Corte"
            variant="primary"
            loading={isUpdating}
            leftIcon={<Ionicons name="cut-outline" size={18} color={colors.text.inverse} />}
            onPress={() => onUpdateStatus(appointment.id, 'IN_SERVICE')}
            style={{ flex: 1, minHeight: 48 }}
          />
        )}

        {/* Botão WhatsApp */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Enviar WhatsApp para ${appointment.customerName}`}
          onPress={handleWhatsApp}
          style={({ pressed }) => ({
            height: 48,
            paddingHorizontal: spacing[4],
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border.default,
            backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            alignSelf: isCompact ? 'stretch' : 'auto',
          })}
        >
          <Ionicons name="logo-whatsapp" size={18} color={colors.feedback.success} />
          <Text variant="bodySm" color={colors.text.primary} weight="medium">
            WhatsApp
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}
