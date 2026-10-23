import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Text, Card, Badge, Button, type BadgeTone } from '../../../shared/ui';
import type { BookingDto } from '../api/bookings.dto';
import { BookingReviewAction } from '../../reviews';

interface BookingCardProps {
  booking: BookingDto;
  onPress?: () => void;
  professionalName?: string | null;
}

function formatCentsToCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getStatusBadgeConfig(status?: string | null): { label: string; tone: BadgeTone } {
  if (!status) {
    return { label: 'Status não informado', tone: 'neutral' };
  }
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
      return { label: 'Confirmado', tone: 'brand' };
    case 'IN_SERVICE':
      return { label: 'Em atendimento', tone: 'info' };
    case 'COMPLETED':
      return { label: 'Concluído', tone: 'success' };
    case 'CANCELLED':
      return { label: 'Cancelado', tone: 'error' };
    case 'NO_SHOW':
      return { label: 'Não compareceu', tone: 'warning' };
    case 'WAITING':
      return { label: 'Aguardando', tone: 'pending' };
    default:
      return { label: status, tone: 'neutral' };
  }
}

function extractValidPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

export function BookingCard({ booking, onPress, professionalName }: BookingCardProps) {
  const { colors, spacing } = useTheme();

  const totalMinutes =
    booking.totalDurationInMinutes ??
    (booking.services.length > 0
      ? booking.services.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0)
      : null);

  const totalPriceInCents =
    booking.totalPriceInCents ??
    (booking.services.length > 0 && booking.services.some((s) => s.priceInCents != null)
      ? booking.services.reduce((acc, s) => acc + (s.priceInCents || 0), 0)
      : null);

  const durationLabel = totalMinutes != null && totalMinutes > 0 ? `${totalMinutes} min` : 'Duração sob consulta';
  const priceLabel = totalPriceInCents != null ? formatCentsToCurrency(totalPriceInCents) : 'A confirmar';

  const dateLabel =
    booking.date instanceof Date
      ? booking.date.toISOString().split('T')[0]
      : String(booking.date ?? (booking.startsAt ? booking.startsAt.split('T')[0] : 'Data a confirmar'));

  const timeLabel =
    booking.startTime && booking.endTime
      ? `${booking.startTime} - ${booking.endTime}`
      : booking.startTime
      ? booking.startTime
      : booking.startsAt
      ? new Date(booking.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : 'Horário a confirmar';

  const statusConfig = getStatusBadgeConfig(booking.status);
  const validCustomerPhone = extractValidPhone(booking.customer?.phoneNumber);

  const content = (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.dateBlock}>
          <Text variant="h3" style={{ color: colors.text.primary, fontWeight: '700' }}>
            {dateLabel}
          </Text>
          <Text variant="caption" style={{ color: colors.text.secondary }}>
            {timeLabel}
          </Text>
        </View>

        <Badge label={statusConfig.label} tone={statusConfig.tone} />
      </View>

      {professionalName ? (
        <View style={{ marginTop: spacing.xs }}>
          <Text variant="caption" style={{ color: colors.text.brand, fontWeight: '600' }}>
            Profissional: {professionalName}
          </Text>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: colors.border.subtle, marginVertical: spacing.sm }]} />

      <View style={styles.servicesContainer}>
        {booking.services.map((svc) => (
          <View key={svc.id ?? svc.serviceId ?? svc.title} style={styles.serviceRow}>
            <Text variant="body" style={{ color: colors.text.primary, flex: 1 }}>
              {svc.title}
            </Text>
            {svc.durationInMinutes != null ? (
              <Text variant="caption" style={{ color: colors.text.secondary, marginRight: spacing.sm }}>
                {svc.durationInMinutes} min
              </Text>
            ) : null}
            <Text variant="body" style={{ color: colors.text.primary, fontWeight: '600' }}>
              {svc.priceInCents != null ? formatCentsToCurrency(svc.priceInCents) : 'A confirmar'}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle, marginVertical: spacing.sm }]} />

      <View style={styles.footerRow}>
        <Text variant="caption" style={{ color: colors.text.secondary }}>
          {durationLabel}
        </Text>
        <Text variant="h3" style={{ color: colors.brand.primary, fontWeight: '700' }}>
          {priceLabel}
        </Text>
      </View>

      {booking.status?.toUpperCase() === 'COMPLETED' ? (
        <View style={{ marginTop: spacing.sm }}>
          <BookingReviewAction bookingId={booking.id} />
        </View>
      ) : null}

      {validCustomerPhone ? (
        <View style={[styles.actionRow, { marginTop: spacing.sm }]}>
          <Button
            title="Contato WhatsApp"
            variant="outline"
            onPress={() => {
              const fullNumber = validCustomerPhone.startsWith('55') ? validCustomerPhone : `55${validCustomerPhone}`;
              void Linking.openURL(`https://wa.me/${fullNumber}`);
            }}
          />
        </View>
      ) : null}
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateBlock: {
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  servicesContainer: {
    gap: 6,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
