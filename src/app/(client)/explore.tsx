import React, { useState } from 'react';
import {
  Platform,
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
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useNavigation } from '@/shared/navigation';
import {
  ClientSearchEntry,
  BarbershopCard,
  DiscoveryFilters,
  DiscoverySkeleton,
  DiscoveryMapModal,
  useDiscovery,
  type PublicShop,
} from '@/features/discovery';

export default function ClientExploreScreen() {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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

  const [mapModalVisible, setMapModalVisible] = useState(false);

  const discovery = useDiscovery({
    initialMode: 'ALL',
    initialRadius: 10,
  });

  const isLocationGranted = discovery.locationSession.state === 'granted';

  const handleOpenShop = (shop: PublicShop) => {
    router.push(`/(public)/barbershops/${shop.id}/services` as any);
  };

  const handleClearFilters = () => {
    discovery.setSearchQuery('');
    discovery.setMode('ALL');
  };

  return (
    <View
      style={[
        styles.screenContainer,
        { backgroundColor: colors.background.primary },
        webBackgroundStyle,
      ]}
    >
      <ScrollView
        onScroll={onContentScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: !isExpanded ? Math.max(insets.bottom, 16) + 96 : 40,
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={discovery.isLoading}
            onRefresh={discovery.refetch}
            tintColor={colors.brand.primary}
          />
        }
      >
        <View style={styles.contentConstraint}>
          {/* Topo: Menu Mobile + Título + Botão Mapa */}
          <View style={styles.headerRow}>
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

              <View style={styles.titleCol}>
                <Text variant="h2" style={styles.headerTitle}>
                  Explorar Barbearias
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  Encontre barbearias para agendar seu próximo corte
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setMapModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Ver barbearias no mapa"
              style={({ pressed }) => [
                styles.mapButton,
                {
                  backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                  borderColor: colors.border.default,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name="map-outline"
                size={18}
                color={colors.brand.primary}
              />
              <Text
                variant="caption"
                style={[styles.mapButtonText, { color: colors.text.primary }]}
              >
                Mapa
              </Text>
            </Pressable>
          </View>

          {/* Campo de Busca */}
          <ClientSearchEntry
            value={discovery.searchQuery}
            onChangeText={discovery.setSearchQuery}
            placeholder="Buscar por nome ou endereço..."
          />

          {/* Filtros de Modo e Raio */}
          <DiscoveryFilters
            mode={discovery.filters.mode}
            onModeChange={discovery.setMode}
            radiusKm={discovery.filters.radiusKm}
            onRadiusChange={discovery.setRadiusKm}
            isLocationAvailable={isLocationGranted}
            onRequestLocation={discovery.requestLocation}
          />

          {/* Banner de Indisponibilidade Geográfica (HTTP 503) */}
          {discovery.isServiceUnavailable && (
            <View
              style={[
                styles.geoWarningBanner,
                {
                  backgroundColor: colors.feedback.warningBackground || colors.surface.elevated,
                  borderColor: colors.border.subtle,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={colors.feedback.warning}
              />
              <View style={styles.geoWarningContent}>
                <Text variant="caption" weight="medium" style={{ color: colors.text.primary }}>
                  Busca por proximidade temporariamente indisponível
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  O serviço geográfico está em manutenção. Você pode consultar a lista completa de barbearias normalmente.
                </Text>
              </View>
              <Button
                title="Ver todas"
                variant="outline"
                onPress={() => discovery.setMode('ALL')}
              />
            </View>
          )}

          {/* Indicador de resultados */}
          <View style={styles.resultCountRow}>
            <Text variant="caption" color={colors.text.secondary}>
              {discovery.isLoading
                ? 'Buscando estabelecimentos...'
                : `${discovery.items.length} ${
                    discovery.items.length === 1 ? 'barbearia encontrada' : 'barbearias encontradas'
                  }`}
            </Text>
          </View>

          {/* Lista de Estabelecimentos */}
          {discovery.isLoading && discovery.items.length === 0 ? (
            <DiscoverySkeleton count={4} />
          ) : discovery.items.length === 0 ? (
            <EmptyState
              title="Nenhuma barbearia encontrada"
              description={
                discovery.searchQuery
                  ? `Não encontramos resultados para "${discovery.searchQuery}". Tente outros termos ou limpe o filtro.`
                  : 'Nenhum estabelecimento encontrado com os filtros selecionados.'
              }
              actionLabel="Limpar filtros"
              onAction={handleClearFilters}
            />
          ) : (
            <View style={styles.listContainer}>
              {discovery.items.map((shop) => (
                <BarbershopCard
                  key={shop.id}
                  shop={shop}
                  onPress={() => handleOpenShop(shop)}
                />
              ))}

              {/* Botão Carregar Mais / Paginação */}
              {discovery.hasNextPage && (
                <View style={styles.loadMoreWrapper}>
                  {discovery.isFetchingNextPage ? (
                    <Spinner size="small" />
                  ) : (
                    <Button
                      title="Carregar mais barbearias"
                      variant="outline"
                      onPress={discovery.fetchNextPage}
                    />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Mapa sob demanda */}
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
  },
  contentConstraint: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
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
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontWeight: '800',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  mapButtonText: {
    fontWeight: '700',
  },
  geoWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  geoWarningContent: {
    flex: 1,
    gap: 2,
  },
  resultCountRow: {
    paddingHorizontal: 4,
  },
  listContainer: {
    gap: 12,
  },
  loadMoreWrapper: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
