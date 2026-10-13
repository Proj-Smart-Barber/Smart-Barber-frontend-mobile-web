import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Text, Card } from '../../../shared/ui';
import type { BookingDto } from '../api/bookings.dto';

interface BookingHistoryProps {
  booking: BookingDto;
}

export function BookingHistory({ booking }: BookingHistoryProps) {
  const { colors, spacing } = useTheme();

  const createdDateStr = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString('pt-BR')
    : null;

  return (
    <Card style={styles.card}>
      <Text variant="h3" style={{ color: colors.text.primary, fontWeight: '700', marginBottom: spacing.xs }}>
        Histórico e Auditoria
      </Text>

      {createdDateStr ? (
        <View style={styles.eventRow}>
          <View style={[styles.dot, { backgroundColor: colors.brand.primary }]} />
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ color: colors.text.primary, fontWeight: '600' }}>
              Agendamento Registrado
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Criado em: {createdDateStr}
            </Text>
            {booking.createdByUserId ? (
              <Text variant="caption" style={{ color: colors.text.muted }}>
                ID do autor: {booking.createdByUserId}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Alerta de contrato: Não inventar sequência de atores */}
      <View style={[styles.noticeBox, { backgroundColor: colors.surface.elevated, borderColor: colors.border.subtle }]}>
        <Text variant="caption" style={{ color: colors.text.secondary }}>
          Contrato de auditoria detalhada: O backend ainda não fornece a trilha de eventos cronológicos completa para esta reserva. Apenas dados de criação autorizados são exibidos.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  noticeBox: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 4,
  },
});
