import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../shared/theme';
import { Text, Card, Badge } from '../../../shared/ui';
import type { BookingDto } from '../api/bookings.dto';

interface BookingCardProps {
  booking: BookingDto;
}

function formatCentsToCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function BookingCard({ booking }: BookingCardProps) {
  const { colors, spacing } = useTheme();

  const totalMinutes =
    booking.totalDurationInMinutes ??
    booking.services.reduce((acc, s) => acc + (s.durationInMinutes || 0), 0);
  const totalPriceInCents =
    booking.totalPriceInCents ??
    booking.services.reduce((acc, s) => acc + (s.priceInCents || 0), 0);
  const durationLabel = `${totalMinutes} min`;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.dateBlock}>
          <Text variant="h3" style={{ color: colors.text.primary, fontWeight: '700' }}>
            {booking.date}
          </Text>
          <Text variant="caption" style={{ color: colors.text.secondary }}>
            {booking.startTime} - {booking.endTime}
          </Text>
        </View>

        {booking.status && (
          <Badge
            label={booking.status}
            tone={booking.status === 'CONFIRMED' ? 'brand' : 'neutral'}
          />
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle, marginVertical: spacing.sm }]} />

      <View style={styles.servicesContainer}>
        {booking.services.map((svc) => (
          <View key={svc.id} style={styles.serviceRow}>
            <Text variant="body" style={{ color: colors.text.primary, flex: 1 }}>
              {svc.title}
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary, marginRight: spacing.sm }}>
              {svc.durationInMinutes} min
            </Text>
            <Text variant="body" style={{ color: colors.text.primary, fontWeight: '600' }}>
              {formatCentsToCurrency(svc.priceInCents)}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border.subtle, marginVertical: spacing.sm }]} />

      <View style={styles.footerRow}>
        <Text variant="caption" style={{ color: colors.text.secondary }}>
          Duração total: {durationLabel}
        </Text>
        <Text variant="h3" style={{ color: colors.brand.primary, fontWeight: '700' }}>
          {formatCentsToCurrency(totalPriceInCents)}
        </Text>
      </View>
    </Card>
  );
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
});
