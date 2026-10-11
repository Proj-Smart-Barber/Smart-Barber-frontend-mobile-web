import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../shared/theme';
import { Text, EmptyState, Spinner, Button } from '../../shared/ui';
import { useSession } from '../../features/auth';
import { useMyBookings } from '../../features/bookings/model/use-my-bookings';
import { BookingCard } from '../../features/bookings/ui/BookingCard';

export default function ClientBookingsScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const {
    data: bookings,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useMyBookings(isAuthenticated);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  const items = bookings ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '700' }}>
            Meus Agendamentos
          </Text>
          <Button
            title="Voltar"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
        <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 4 }}>
          Histórico e próximos horários agendados nas barbearias.
        </Text>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.feedback.error }}>
            Não foi possível carregar seus agendamentos.
          </Text>
          <Button
            title="Tentar novamente"
            variant="outline"
            style={{ marginTop: spacing.md }}
            onPress={() => refetch()}
          />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum agendamento encontrado"
          description="Você ainda não possui agendamentos cadastrados."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookingCard booking={item} />}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
