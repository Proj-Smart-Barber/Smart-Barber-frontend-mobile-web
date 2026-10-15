import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import {
  ClientHeader,
  ClientSearchEntry,
  ClientNextBookingCard,
  BarbershopCard,
  DiscoverySkeleton,
  useDiscovery,
  useNextBooking,
  DiscoveryMapModal,
} from '@/features/discovery';

export default function ClientHomeScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [mapModalVisible, setMapModalVisible] = useState(false);

  // Consulta autoritativa do próximo atendimento
  const {
    booking: nextBooking,
    serverTime,
    isLoading: isBookingLoading,
    isError: isBookingError,
    refetch: refetchBooking,
  } = useNextBooking();

  // Descoberta de barbearias (ALL como base, NEARBY quando localização concedida)
  const discovery = useDiscovery({
    initialMode: 'ALL',
    initialRadius: 10,
  });

  const isLocationGranted = discovery.locationSession.state === 'granted';

  const onRefresh = async () => {
    await Promise.all([refetchBooking(), discovery.refetch()]);
  };

  const previewItems = discovery.items.slice(0, 4);
  const remainingItems = discovery.items.slice(4, 10);

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background.primary }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: isCompact ? insets.bottom + 80 : 32,
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={discovery.isLoading || isBookingLoading}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
          />
        }
      >
        <View style={styles.contentConstraint}>
          {/* 1. Header do Cliente */}
          <ClientHeader
            locationSession={discovery.locationSession}
            onRequestLocation={discovery.requestLocation}
          />

          {/* 2. Busca Rápida (redireciona para /explore com termo) */}
          <ClientSearchEntry
            isReadOnlyButton
            placeholder="Buscar barbearia ou endereço..."
            onPressPlaceholder={() => router.push('/(client)/explore')}
          />

          {/* 3. Card de Próximo Agendamento */}
          <ClientNextBookingCard
            booking={nextBooking}
            serverTime={serverTime}
            isLoading={isBookingLoading}
            isError={isBookingError}
            onRetry={refetchBooking}
            onFindBarbershop={() => router.push('/(client)/explore')}
          />

          {/* Banner discreto para ativar localização quando inativa */}
          {!isLocationGranted && (
            <Pressable
              onPress={discovery.requestLocation}
              accessibilityRole="button"
              accessibilityLabel="Ativar localização para encontrar barbearias mais próximas"
              style={[
                styles.locationBanner,
                {
                  backgroundColor: colors.surface.default,
                  borderColor: colors.border.subtle,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name="navigate-circle-outline"
                size={22}
                color={colors.brand.primary}
                style={styles.bannerIcon}
              />
              <View style={styles.bannerTextCol}>
                <Text variant="caption" weight="medium" color={colors.text.primary}>
                  Ver barbearias mais próximas de você
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  Toque para ativar o GPS e calcular a distância até você.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.text.secondary}
              />
            </Pressable>
          )}

          {/* 4. Barbearias em Destaque / Próximas */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleCol}>
              <Text variant="h3" weight="bold" style={styles.sectionTitle}>
                {isLocationGranted ? 'Perto de Você' : 'Barbearias Disponíveis'}
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                {isLocationGranted
                  ? 'Calculado com base na sua localização atual'
                  : 'Encontre estabelecimentos e veja os serviços'}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/(client)/explore')}
              accessibilityRole="button"
              accessibilityLabel="Ver todas as barbearias"
              hitSlop={8}
            >
              <Text
                variant="caption"
                style={[styles.seeAllText, { color: colors.brand.primary }]}
              >
                Ver todas
              </Text>
            </Pressable>
          </View>

          {/* Loading Skeleton */}
          {discovery.isLoading && discovery.items.length === 0 && (
            <DiscoverySkeleton />
          )}

          {/* Lista de Prévia */}
          {!discovery.isLoading && previewItems.length > 0 && (
            <View style={styles.cardsGrid}>
              {previewItems.map((shop) => (
                <BarbershopCard key={shop.id} shop={shop} />
              ))}
            </View>
          )}

          {/* Ação "Ver no mapa" sob demanda */}
          {!discovery.isLoading && previewItems.length > 0 && (
            <View style={styles.mapActionRow}>
              <Button
                title="Ver no mapa"
                variant="outline"
                onPress={() => setMapModalVisible(true)}
                style={styles.mapActionButton}
              />
            </View>
          )}

          {/* 5. Seção secundária: Conheça outras barbearias (se houver itens adicionais) */}
          {!discovery.isLoading && remainingItems.length > 0 && (
            <View style={styles.secondarySection}>
              <Text variant="body" weight="medium" style={styles.secondaryTitle}>
                Conheça outras barbearias
              </Text>
              <View style={styles.cardsGrid}>
                {remainingItems.map((shop) => (
                  <BarbershopCard key={shop.id} shop={shop} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Mapa opcional */}
      <DiscoveryMapModal
        visible={mapModalVisible}
        onClose={() => setMapModalVisible(false)}
        items={discovery.items}
        userCoordinates={discovery.locationSession.coords}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  contentConstraint: {
    width: '100%',
    maxWidth: 720,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    marginVertical: 10,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerTextCol: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitleCol: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '800',
    marginBottom: 2,
  },
  seeAllText: {
    fontWeight: '700',
  },
  cardsGrid: {
    gap: 4,
  },
  mapActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  mapActionButton: {
    minWidth: 140,
  },
  secondarySection: {
    marginTop: 24,
  },
  secondaryTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
});
