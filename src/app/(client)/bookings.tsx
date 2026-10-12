import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../shared/theme';
import { Text, EmptyState, Spinner, Button, Card, Badge } from '../../shared/ui';
import { useSession } from '../../features/auth';
import { useMyBookings } from '../../features/bookings/model/use-my-bookings';
import { BookingCard } from '../../features/bookings/ui/BookingCard';
import type { BookingDto } from '../../features/bookings/api/bookings.dto';

type TabFilter = 'upcoming' | 'past' | 'all';

export default function ClientBookingsScreen() {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();
  const { status, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');

  const {
    bookings,
    upcoming,
    past,
    nextBooking,
    isLoading,
    isFetchingNextPage,
    hasMore,
    loadNextPage,
    error,
    refetch,
    isRefetching,
  } = useMyBookings({
    actorId: identity?.id,
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Spinner size="large" />
      </View>
    );
  }

  const displayedItems =
    activeTab === 'upcoming' ? upcoming : activeTab === 'past' ? past : bookings;

  const handleOpenDetail = (booking: BookingDto) => {
    router.push(`/(account)/bookings/${booking.id}` as any);
  };

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
          Acompanhe seus horários agendados e consulte seu histórico.
        </Text>

        {/* Tab Filters */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface.elevated, borderRadius: radius.md, marginTop: spacing.md }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'upcoming' && { backgroundColor: colors.surface.selected, borderRadius: radius.sm },
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              variant="body"
              style={{
                color: activeTab === 'upcoming' ? colors.brand.primary : colors.text.secondary,
                fontWeight: activeTab === 'upcoming' ? '700' : '500',
              }}
            >
              Próximos ({upcoming.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'past' && { backgroundColor: colors.surface.selected, borderRadius: radius.sm },
            ]}
            onPress={() => setActiveTab('past')}
          >
            <Text
              variant="body"
              style={{
                color: activeTab === 'past' ? colors.brand.primary : colors.text.secondary,
                fontWeight: activeTab === 'past' ? '700' : '500',
              }}
            >
              Histórico ({past.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'all' && { backgroundColor: colors.surface.selected, borderRadius: radius.sm },
            ]}
            onPress={() => setActiveTab('all')}
          >
            <Text
              variant="body"
              style={{
                color: activeTab === 'all' ? colors.brand.primary : colors.text.secondary,
                fontWeight: activeTab === 'all' ? '700' : '500',
              }}
            >
              Todos ({bookings.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.feedback.error, textAlign: 'center' }}>
            Não foi possível carregar os agendamentos devido a uma instabilidade no servidor (503/rede).
          </Text>
          <Button
            title="Tentar novamente"
            variant="outline"
            style={{ marginTop: spacing.md }}
            onPress={() => refetch()}
          />
        </View>
      ) : displayedItems.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'upcoming'
              ? 'Nenhum agendamento futuro'
              : activeTab === 'past'
              ? 'Nenhum agendamento no histórico'
              : 'Nenhum agendamento encontrado'
          }
          description="Você ainda não possui horários nesta categoria."
        />
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => handleOpenDetail(item)}
            />
          )}
          ListHeaderComponent={
            activeTab === 'upcoming' && nextBooking ? (
              <Card
                style={[
                  styles.nextBookingBanner,
                  { borderColor: colors.brand.primary, borderWidth: 1, marginBottom: spacing.md },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Text variant="caption" style={{ color: colors.brand.primary, fontWeight: '700' }}>
                    PRÓXIMO ATENDIMENTO
                  </Text>
                  <Badge label="Destaque" tone="brand" />
                </View>
                <Text variant="body" style={{ color: colors.text.primary, fontWeight: '600' }}>
                  {nextBooking.services.map((s) => s.title).join(', ')}
                </Text>
                <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
                  Data: {String(nextBooking.date ?? nextBooking.startsAt?.split('T')[0] ?? '')} às {nextBooking.startTime ?? ''}
                </Text>
              </Card>
            ) : null
          }
          ListFooterComponent={
            <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
              <Text variant="caption" style={{ color: colors.text.muted, textAlign: 'center', marginBottom: spacing.xs }}>
                Exibindo agendamentos carregados. O histórico completo é recuperado sob demanda.
              </Text>
              {hasMore ? (
                <Button
                  title={isFetchingNextPage ? 'Carregando mais...' : 'Carregar mais agendamentos'}
                  variant="outline"
                  onPress={loadNextPage}
                  disabled={isFetchingNextPage}
                />
              ) : null}
            </View>
          }
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
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBookingBanner: {
    padding: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
