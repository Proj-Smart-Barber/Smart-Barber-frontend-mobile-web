import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../shared/theme';
import { Text, Button } from '../../../shared/ui';
import { BookingDetailView } from '../../../features/bookings/ui/BookingDetailView';

export default function AccountBookingDetailScreen() {
  const { colors, spacing } = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();

  if (!bookingId || typeof bookingId !== 'string') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Text variant="body" style={{ color: colors.feedback.error }}>
          Identificador de agendamento inválido.
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <BookingDetailView
        bookingId={bookingId}
        scope="PERSONAL"
        onBack={() => router.back()}
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
