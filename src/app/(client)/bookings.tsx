import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform, View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '../../shared/theme';
import { useAppSafeArea } from '../../shared/theme/use-app-safe-area';
import { Text, EmptyState, Button, SegmentedFilter, LoadingRegion } from '../../shared/ui';
import { useNavigation } from '../../shared/navigation';
import { ClientNavbarMetricsContext } from '../../shared/navigation/ClientNavbarMetrics';
import { useSession } from '@/features/auth';
import { useNextBooking } from '@/features/discovery/model/use-next-booking';
import { ClientNextBookingCard } from '@/features/discovery/ui/ClientNextBookingCard';
import { useOptionalClientExperienceContext } from '@/features/discovery/model/client-experience-context';
import { useMyBookings } from '@/features/bookings/model/use-my-bookings';
import { ClientBookingsSkeleton } from '@/features/bookings/ui/ClientBookingsSkeleton';
import { BookingCard } from '@/features/bookings/ui/BookingCard';

type TabFilter = 'upcoming' | 'past';

const tabOptions = [
  { value: 'upcoming' as const, label: 'Próximos' },
  { value: 'past' as const, label: 'Histórico' },
];

export default function ClientBookingsScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useAppSafeArea();
  const navbarOffset = React.useContext(ClientNavbarMetricsContext);
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { status, identity } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [activeTab, setActiveTab] = useState<TabFilter>(() => {
    return params?.tab === 'history' ? 'past' : 'upcoming';
  });

  useEffect(() => {
    if (params?.tab === 'history') {
      setActiveTab('past');
    } else if (params?.tab === 'upcoming' || !params?.tab) {
      setActiveTab('upcoming');
    } else {
      setActiveTab('upcoming');
    }
  }, [params?.tab]);

  const clientExperience = useOptionalClientExperienceContext();

  const handleNovaReserva = useCallback(() => {
    if (clientExperience?.requestBooking) {
      clientExperience.requestBooking();
    } else {
      router.push('/(client)/explore' as any);
    }
  }, [clientExperience, router]);

  let onContentScroll: ((event: any) => void) | undefined;
  try {
    const nav = useNavigation();
    onContentScroll = nav.onContentScroll;
  } catch {
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

  // Consulta autoritativa do próximo atendimento
  const {
    booking: nextBooking,
    serverTime,
    isLoading: isNextLoading,
    isError: isNextError,
    refetch: refetchNextBooking,
  } = useNextBooking();

  // Consulta paginada das reservas do cliente
  const {
    bookings,
    upcoming,
    past,
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

  // Deduplicação entre o destaque autoritativo e a lista paginada de próximos
  const filteredUpcoming = useMemo(() => {
    if (!nextBooking?.id) return upcoming;
    return upcoming.filter((item) => item.id !== nextBooking.id);
  }, [upcoming, nextBooking?.id]);

  const displayedItems = activeTab === 'upcoming' ? filteredUpcoming : past;

  const handleOpenDetail = (bookingId: string) => {
    router.push({
      pathname: '/(account)/bookings/[bookingId]',
      params: { bookingId, agendaTab: activeTab === 'past' ? 'history' : 'upcoming' },
    });
  };

  const renderListHeader = () => {
    if (activeTab !== 'upcoming') return null;

    return (
      <View style={[styles.contentConstraint, { marginBottom: spacing.md }]}>
        <ClientNextBookingCard
          booking={nextBooking}
          serverTime={serverTime}
          isLoading={isNextLoading}
          isError={isNextError}
          onRetry={() => {
            void refetchNextBooking();
          }}
          onFindBarbershop={handleNovaReserva}
          onOpenBooking={handleOpenDetail}
        />
      </View>
    );
  };

  const renderListEmpty = () => {
    // Se a categoria filtrada está vazia mas ainda há páginas a carregar
    if (hasMore) {
      return (
        <View
          style={[
            styles.contentConstraint,
            styles.emptyCategoryCard,
            {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(0, 0, 0, 0.03)',
              borderColor: isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.08)',
              borderRadius: radius.lg,
              padding: spacing.lg,
            },
          ]}
        >
          <Text
            variant="body"
            weight="medium"
            style={{ color: colors.text.primary, textAlign: 'center' }}
          >
            {activeTab === 'upcoming'
              ? 'Nenhum agendamento futuro encontrado nas páginas carregadas.'
              : 'Nenhum agendamento no histórico encontrado nas páginas carregadas.'}
          </Text>
          <Text
            variant="caption"
            style={{
              color: colors.text.secondary,
              textAlign: 'center',
              marginTop: 4,
              marginBottom: spacing.md,
            }}
          >
            Existem mais agendamentos disponíveis no seu histórico completo.
          </Text>
          <Button
            title={isFetchingNextPage ? 'Buscando mais...' : 'Buscar mais agendamentos'}
            variant="outline"
            onPress={loadNextPage}
            disabled={isFetchingNextPage}
          />
        </View>
      );
    }

    // Se todas as páginas foram esgotadas
    if (activeTab === 'upcoming') {
      if (nextBooking) {
        return (
          <View
            style={[
              styles.contentConstraint,
              { paddingVertical: spacing.lg, alignItems: 'center' },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: colors.text.muted, textAlign: 'center' }}
            >
              Você não possui outros agendamentos futuros.
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.contentConstraint}>
          <EmptyState
            title="Nenhum agendamento futuro"
            description="Você ainda não possui horários agendados. Explore barbearias parceiras e escolha o melhor horário para você."
            actionLabel="Nova reserva"
            onAction={handleNovaReserva}
          />
        </View>
      );
    }

    return (
      <View style={styles.contentConstraint}>
        <EmptyState
          title="Nenhum agendamento no histórico"
          description="Você ainda não possui atendimentos anteriores finalizados."
          actionLabel="Explorar barbearias"
          onAction={handleNovaReserva}
        />
      </View>
    );
  };

  const renderListFooter = () => {
    if (displayedItems.length === 0) return null;

    if (error) {
      return (
        <View
          style={[
            styles.contentConstraint,
            { paddingVertical: spacing.md, alignItems: 'center' },
          ]}
        >
          <Text
            variant="caption"
            style={{
              color: colors.feedback.error,
              textAlign: 'center',
              marginBottom: spacing.xs,
            }}
          >
            Não foi possível carregar mais agendamentos.
          </Text>
          <Button
            title="Tentar novamente"
            variant="outline"
            onPress={loadNextPage}
            disabled={isFetchingNextPage}
          />
        </View>
      );
    }

    if (hasMore) {
      return (
        <View
          style={[
            styles.contentConstraint,
            { paddingVertical: spacing.md, alignItems: 'center' },
          ]}
        >
          <Text
            variant="caption"
            style={{
              color: colors.text.muted,
              textAlign: 'center',
              marginBottom: spacing.xs,
            }}
          >
            Exibindo agendamentos carregados. O histórico completo é recuperado sob demanda.
          </Text>
          <Button
            title={isFetchingNextPage ? 'Buscando mais...' : 'Buscar mais agendamentos'}
            variant="outline"
            onPress={loadNextPage}
            disabled={isFetchingNextPage}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.contentConstraint,
          { paddingVertical: spacing.md, alignItems: 'center' },
        ]}
      >
        <Text
          variant="caption"
          style={{ color: colors.text.muted, textAlign: 'center' }}
        >
          Fim dos agendamentos disponíveis.
        </Text>
      </View>
    );
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
                  onPress={handleNovaReserva}
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
                onPress={handleNovaReserva}
              />
            </View>
          )}

          {/* Filtro Segmentado Canônico sem contagens globais fictícias */}
          <SegmentedFilter<TabFilter>
            options={tabOptions}
            value={activeTab}
            onChange={setActiveTab}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>

      {isLoading && bookings.length === 0 ? (
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
      ) : error && bookings.length === 0 ? (
        <View style={styles.center}>
          <Text variant="body" style={{ color: colors.feedback.error, textAlign: 'center' }}>
            Não foi possível carregar seus agendamentos.
          </Text>
          <Button
            title="Tentar novamente"
            variant="outline"
            style={{ marginTop: spacing.md }}
            onPress={() => {
              void refetch();
            }}
          />
        </View>
      ) : (
        <FlatList
          data={displayedItems}
          keyExtractor={(item) => item.id}
          onScroll={onContentScroll}
          scrollEventThrottle={16}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderListEmpty}
          ListFooterComponent={renderListFooter}
          renderItem={({ item }) => (
            <View style={styles.contentConstraint}>
              <BookingCard
                booking={item}
                isFeatured={false}
                onPress={() => handleOpenDetail(item.id)}
              />
            </View>
          )}
          contentContainerStyle={{
            paddingHorizontal: isCompact ? 16 : 32,
            paddingTop: 8,
            paddingBottom: !isExpanded
              ? navbarOffset > 0
                ? navbarOffset + 16
                : Math.max(insets.bottom, 16) + 96
              : 40,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
                void refetchNextBooking();
              }}
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
  emptyCategoryCard: {
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
