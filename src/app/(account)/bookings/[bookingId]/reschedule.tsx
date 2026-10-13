import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/shared/theme';
import { Text, Button, Spinner, Alert } from '@/shared/ui';
import { useBookingDetail } from '@/features/bookings/model/use-booking-detail';
import { BookingFlowView } from '@/features/bookings/ui/BookingFlowView';
import { resolveBookingContext } from '@/features/bookings/model/resolve-booking-context';
import { useSession } from '@/features/auth';

export default function RescheduleBookingScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { bookingId, scope } = useLocalSearchParams<{ bookingId: string; scope?: string }>();
  const { identity, memberships, selectedShopId } = useSession();

  const resolvedScope = scope === 'UNIT' ? 'UNIT' : 'PERSONAL';

  const {
    booking,
    isLoading,
    error,
    refetch,
  } = useBookingDetail({
    bookingId: bookingId || '',
    scope: resolvedScope,
    enabled: Boolean(bookingId),
  });

  if (!bookingId || typeof bookingId !== 'string') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Text variant="body" style={{ color: colors.feedback.error }}>
          Identificador de agendamento inválido para remarcação.
        </Text>
        <Button
          title="Voltar"
          variant="outline"
          style={{ marginTop: spacing.md }}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Text variant="body" style={{ color: colors.feedback.error, textAlign: 'center' }}>
          Não foi possível carregar a reserva para remarcação.
        </Text>
        <Button
          title="Tentar novamente"
          variant="outline"
          style={{ marginTop: spacing.md }}
          onPress={() => refetch()}
        />
        <Button
          title="Voltar"
          variant="ghost"
          style={{ marginTop: spacing.sm }}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  // Validação do contexto de remarcação frontend sem conceder autoridade pela URL
  const context = resolveBookingContext({
    actorId: identity?.id,
    selectedMembership:
      memberships.find(member => member.id === selectedShopId && member.id === booking.barbershopId) ?? null,
    booking,
    requestedScope: resolvedScope,
  });

  if (!context.canAccess) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Alert
          variant="error"
          title="Acesso Negado"
          message={context.reason || 'Você não tem permissão para acessar este agendamento.'}
        />
        <Button
          title="Voltar"
          variant="outline"
          style={{ marginTop: spacing.md }}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  if (!context.canReschedule) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Alert
          variant="warning"
          title="Remarcação Não Permitida"
          message="Este agendamento não está elegível para remarcação (prazo limite expirado ou status incompatível)."
        />
        <Button
          title="Voltar"
          variant="outline"
          style={{ marginTop: spacing.md }}
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const initialDateStr =
    typeof booking.date === 'string'
      ? booking.date.split('T')[0]
      : booking.date instanceof Date
      ? booking.date.toISOString().split('T')[0]
      : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <BookingFlowView
        options={{
          mode: resolvedScope,
          flowMode: 'RESCHEDULE',
          shopId: booking.barbershopId,
          bookingId: booking.id,
          initialBooking: booking,
          initialServiceIds: (booking.services || [])
            .map((s) => s.id || s.serviceId)
            .filter((id): id is string => Boolean(id)),
          initialDate: initialDateStr,
          initialProfessionalId: booking.barbermanId,
          initialCustomer: booking.customer
            ? {
                id: booking.customer.id,
                name: booking.customer.name,
                isEligible: true,
              }
            : null,
        }}
        onExit={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
