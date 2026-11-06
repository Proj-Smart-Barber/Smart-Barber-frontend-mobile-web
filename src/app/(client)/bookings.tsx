import React, { useState } from 'react';
import { Platform, View, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '../../shared/theme';
import { useAppSafeArea } from '../../shared/theme/use-app-safe-area';
import { Text, EmptyState, Spinner, Button, Card, Badge, SegmentedFilter, LoadingRegion } from '../../shared/ui';
import { useNavigation } from '../../shared/navigation';
import { ClientNavbarMetricsContext } from '../../shared/navigation/ClientNavbarMetrics';
import { useSession } from '../../features/auth';
import { ClientExploreTabs, type ClientExploreSection } from '../../features/discovery';
import { useMyBookings, ClientBookingsSkeleton } from '../../features/bookings';
import { BookingCard } from '../../features/bookings/ui/BookingCard';
import type { BookingDto } from '../../features/bookings/api/bookings.dto';

type TabFilter = 'upcoming' | 'past' | 'all';

export default function ClientBookingsScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useAppSafeArea();
  const navbarOffset = React.useContext(ClientNavbarMetricsContext);
  const router = useRouter();
  const { status, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');

  let openDrawer: (() => void) | undefined;
  let onContentScroll: ((event: any) => void) | undefined;
  try {
    const nav = useNavigation();
    openDrawer = nav.openDrawer;
    onContentScroll = nav.onContentScroll;
  } catch {
    openDrawer = undefined;
    onContentScroll = undefined;
  }

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

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

  const displayedItems =
    activeTab === 'upcoming' ? upcoming : activeTab === 'past' ? past : bookings;

  const handleOpenDetail = (booking: BookingDto) => {
    router.push(`/(account)/bookings/${booking.id}` as any);
  };

  const handleSelectExploreSection = (section: ClientExploreSection) => {
    if (section === 'bookings') return;
    if (section === 'nearby') {
      router.push('/(client)/explore?section=nearby' as any);
      return;
    }
    router.push('/(client)/explore' as any);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.primary },
        webBackgroundStyle,
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top > 0 ? insets.top + 8 : 16,
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
      >
        <View style={styles.contentConstraint}>
          <ClientExploreTabs
            active="bookings"
            onSelect={handleSelectExploreSection}
            style={{ marginBottom: spacing.md }}
          />

          {isCompact ? (
            <View style={styles.compactHeader}>
              <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '800' }}>
                Meus agendamentos
              </Text>
              <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
                Seus próximos horários e histórico
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title="Nova reserva"
                  variant="primary"
                  leftIcon={<Ionicons name="add" size={18} color="#FFFFFF" />}
                  onPress={() => router.push('/(client)/explore')}
                />
              </View>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="h2" style={{ color: colors.text.primary, fontWeight: '800' }}>
                  Meus agendamentos
                </Text>
                <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
                  Seus próximos horários e histórico
                </Text>
              </View>

              <Button
                title="Nova reserva"
                variant="primary"
                leftIcon={<Ionicons name="add" size={18} color="#FFFFFF" />}
                onPress={() => router.push('/(client)/explore')}
              />
            </View>
          )}

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

      {isLoading ? (
        <LoadingRegion
          phase="initial"
          busy={true}
          accessibilityLabel="Carregando seus agendamentos"
          placeholder={
            <View style={styles.contentConstraint}>
              <ClientBookingsSkeleton count={3} />
            </View>
          }
          style={{ flex: 1, paddingHorizontal: isCompact ? 16 : 32, paddingTop: spacing.md }}
        />
      ) : error ? (
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
          onScroll={onContentScroll}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <View style={styles.contentConstraint}>
              <BookingCard
                booking={item}
                isFeatured={activeTab === 'upcoming' && index === 0 && item.id === nextBooking?.id}
                onPress={() => handleOpenDetail(item)}
              />
            </View>
          )}
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
            paddingBottom: !isExpanded
              ? (navbarOffset > 0 ? navbarOffset + 16 : Math.max(insets.bottom, 16) + 96)
              : 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { void refetch(); }}
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
  compactHeader: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});

