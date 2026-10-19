import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '../../shared/theme';
import { Text, EmptyState, Spinner, Button, Card, Badge, SegmentedFilter } from '../../shared/ui';
import { useNavigation } from '../../shared/navigation';
import { useSession } from '../../features/auth';
import { useMyBookings } from '../../features/bookings/model/use-my-bookings';
import { BookingCard } from '../../features/bookings/ui/BookingCard';
import type { BookingDto } from '../../features/bookings/api/bookings.dto';

type TabFilter = 'upcoming' | 'past' | 'all';

export default function ClientBookingsScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');

  let openDrawer: (() => void) | undefined;
  try {
    openDrawer = useNavigation().openDrawer;
  } catch {
    openDrawer = undefined;
  }

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
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
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
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
      >
        <View style={styles.contentConstraint}>
          <View style={styles.titleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
              {!isExpanded && openDrawer ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Abrir menu de navegação"
                  onPress={openDrawer}
                  style={({ pressed }) => [
                    styles.menuButton,
                    {
                      borderRadius: radius.md,
                      backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                      borderColor: colors.border.default,
                    },
                  ]}
                >
                  <Ionicons name="menu-outline" size={22} color={colors.text.primary} />
                </Pressable>
              ) : null}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '800' }}>
                  Meus Agendamentos
                </Text>
                <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
                  Acompanhe seus horários agendados e consulte seu histórico.
                </Text>
              </View>
            </View>

            <Button
              title="Nova reserva"
              variant="primary"
              leftIcon={<Ionicons name="add" size={18} color="#FFFFFF" />}
              onPress={() => router.push('/(client)/explore')}
            />
          </View>

          {/* Filtro Segmentado Canônico (Padrão Owner) */}
          <SegmentedFilter<TabFilter>
            options={[
              { value: 'upcoming', label: 'Próximos', count: upcoming.length },
              { value: 'past', label: 'Histórico', count: past.length },
              { value: 'all', label: 'Todos', count: bookings.length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            style={{ marginTop: spacing.md }}
          />
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
          actionLabel="Explorar barbearias"
          onAction={() => router.push('/(client)/explore')}
        />
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.contentConstraint}>
              <BookingCard
                booking={item}
                onPress={() => handleOpenDetail(item)}
              />
            </View>
          )}
          ListHeaderComponent={
            activeTab === 'upcoming' && nextBooking ? (
              <View style={styles.contentConstraint}>
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
              </View>
            ) : null
          }
          ListFooterComponent={
            <View style={[styles.contentConstraint, { paddingVertical: spacing.md, alignItems: 'center' }]}>
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
          contentContainerStyle={{
            paddingHorizontal: isCompact ? 16 : 32,
            paddingTop: 8,
            paddingBottom: !isExpanded ? Math.max(insets.bottom, 16) + 96 : 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand.primary}
            />
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
    paddingBottom: 12,
  },
  contentConstraint: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nextBookingBanner: {
    padding: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

