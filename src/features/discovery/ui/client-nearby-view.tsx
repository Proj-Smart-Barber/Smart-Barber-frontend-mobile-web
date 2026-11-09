import React, { useState, useRef, useContext, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import { ClientNavbarMetricsContext } from '@/shared/navigation/ClientNavbarMetrics';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { TextInput } from '@/shared/ui/TextInput';
import { LoadingRegion } from '@/shared/ui/LoadingRegion';
import { Spinner } from '@/shared/ui/Spinner';
import { BrandMark } from '@/shared/brand';
import { useDiscovery } from '../model/use-discovery';
import {
  useClientNearbyViewState,
  type ClientNearbyViewState,
} from '../model/use-client-nearby-view-state';
import { locationStore } from '../model/location-provider';
import type { LocationOnboardingStage } from '../model/use-client-location-onboarding';
import type { DiscoveryMode, DiscoveryRadius } from '../model/discovery.types';
import {
  buildBarbershopCatalogHref,
  type PublicShop,
} from '../api/discovery.contract';
import { BarbershopCard } from './BarbershopCard';
import { NearbyResultsSkeleton } from './NearbyResultsSkeleton';
import { LocationStatusPanel, type LocationPanelStatus } from './location-status-panel';
import { DiscoveryMapModal } from './DiscoveryMapModal';

const RADIUS_OPTIONS: readonly DiscoveryRadius[] = [5, 10, 25, 50];

export interface ClientNearbyViewProps {
  onboardingStage?: LocationOnboardingStage;
  canAskAgain?: boolean;
  onRecoverPermission?: () => void | Promise<void>;
  onRetryPosition?: () => void | Promise<void>;
  initialMode?: DiscoveryMode;
  initialRadius?: DiscoveryRadius;
  initialQuery?: string;
  actorId?: string | null;
}

export function ClientNearbyView({
  onboardingStage,
  canAskAgain = true,
  onRecoverPermission,
  onRetryPosition,
  initialMode = 'ALL',
  initialRadius = 10,
  initialQuery = '',
  actorId,
}: ClientNearbyViewProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const insets = useAppSafeArea();
  const navbarOffset = useContext(ClientNavbarMetricsContext);
  const router = useRouter();

  const searchInputRef = useRef<React.ComponentRef<typeof RNTextInput>>(null);
  const listRef = useRef<FlatList<PublicShop>>(null);

  const { initialState, saveState } = useClientNearbyViewState(
    {
      mode: initialMode,
      radiusKm: initialRadius,
      searchQuery: initialQuery,
      regionFilter: '',
      scrollOffset: 0,
    },
    actorId,
  );

  const [regionFilter, setRegionFilter] = useState(initialState.regionFilter);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const scrollOffsetRef = useRef<number>(initialState.scrollOffset);

  const {
    filters,
    effectiveMode,
    searchQuery,
    setSearchQuery,
    setMode,
    setRadiusKm,
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    isServiceUnavailable,
    refetch,
    locationSession,
    requestLocation,
  } = useDiscovery({
    initialMode: initialState.mode,
    initialRadius: initialState.radiusKm,
    initialQuery: initialState.searchQuery,
  });

  const hasValidCoordinates =
    locationSession.state === 'granted' && locationSession.coords !== null;

  const isProximityActive =
    effectiveMode === 'NEARBY' &&
    hasValidCoordinates &&
    !isServiceUnavailable &&
    !regionFilter.trim();

  // Preservação contínua de estado no QueryClient por ator
  const currentStateRef = useRef<ClientNearbyViewState>({
    mode: filters.mode,
    radiusKm: filters.radiusKm,
    searchQuery,
    regionFilter,
    scrollOffset: initialState.scrollOffset,
  });

  React.useEffect(() => {
    currentStateRef.current = {
      mode: filters.mode,
      radiusKm: filters.radiusKm,
      searchQuery,
      regionFilter,
      scrollOffset: scrollOffsetRef.current,
    };
    saveState(currentStateRef.current);
  }, [filters.mode, filters.radiusKm, searchQuery, regionFilter, saveState]);

  React.useEffect(() => {
    return () => {
      saveState({
        ...currentStateRef.current,
        scrollOffset: scrollOffsetRef.current,
      });
    };
  }, [saveState]);

  // Restauração de scroll com guarda única e respeitando conteúdo
  const hasRestoredScrollRef = useRef(false);
  React.useEffect(() => {
    if (hasRestoredScrollRef.current) return;
    if (initialState.scrollOffset <= 0) {
      hasRestoredScrollRef.current = true;
      return;
    }
    if (items.length > 0 && !isLoading && listRef.current) {
      hasRestoredScrollRef.current = true;
      const safeOffset = Math.max(0, initialState.scrollOffset);
      try {
        listRef.current.scrollToOffset({
          offset: safeOffset,
          animated: false,
        });
      } catch {
        // no-op
      }
    }
  }, [items.length, isLoading, initialState.scrollOffset]);

  // Resolve status of LocationStatusPanel without mixing denied, unavailable/timeout, and 503 service failure
  const locationPanelStatus: LocationPanelStatus = (() => {
    if (isServiceUnavailable) {
      return 'service_unavailable';
    }
    if (hasValidCoordinates) {
      return 'ready';
    }
    if (
      onboardingStage === 'denied' ||
      locationSession.state === 'denied'
    ) {
      return 'denied';
    }
    if (
      onboardingStage === 'unavailable' ||
      locationSession.state === 'unavailable' ||
      locationSession.state === 'timeout' ||
      locationSession.state === 'stale'
    ) {
      return 'unavailable';
    }
    if (!hasValidCoordinates) {
      return 'denied';
    }
    return 'ready';
  })();

  const handleRecoverPermission = async () => {
    if (onRecoverPermission) {
      await onRecoverPermission();
    } else {
      await requestLocation();
    }
    if (locationStoreHasCoords()) {
      setRegionFilter('');
      setMode('NEARBY');
    }
  };

  const handleRetryPosition = async () => {
    if (isServiceUnavailable) {
      setMode('NEARBY');
      refetch();
      return;
    }
    if (onRetryPosition) {
      await onRetryPosition();
    } else {
      await requestLocation();
    }
    if (locationStoreHasCoords()) {
      setRegionFilter('');
      setMode('NEARBY');
    }
  };

  function locationStoreHasCoords(): boolean {
    const current = locationStore.getSession();
    return (
      ((current.state === 'granted' || current.state === 'stale') &&
        current.coords !== null) ||
      ((locationSession.state === 'granted' || locationSession.state === 'stale') &&
        locationSession.coords !== null)
    );
  }

  const handleFocusManualSearch = () => {
    setMode('ALL');
    searchInputRef.current?.focus?.();
  };

  const handleOpenShopCatalog = (shop: PublicShop) => {
    router.push(buildBarbershopCatalogHref(shop.id) as any);
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  };

  const sanitizedItems = items.map((shop) =>
    isProximityActive
      ? shop
      : {
          ...shop,
          distanceMeters: null,
        },
  );

  // Barbearias que possuem coordenadas válidas e finitas (-90..90 lat, -180..180 lng)
  const mappableUnits = useMemo(() => {
    return sanitizedItems.filter(
      (shop) =>
        shop.coordinates &&
        typeof shop.coordinates.latitude === 'number' &&
        Number.isFinite(shop.coordinates.latitude) &&
        shop.coordinates.latitude >= -90 &&
        shop.coordinates.latitude <= 90 &&
        typeof shop.coordinates.longitude === 'number' &&
        Number.isFinite(shop.coordinates.longitude) &&
        shop.coordinates.longitude >= -180 &&
        shop.coordinates.longitude <= 180,
    );
  }, [sanitizedItems]);

  const isMapDisabled = isLoading || mappableUnits.length === 0;

  const bottomPadding = !isExpanded
    ? navbarOffset > 0
      ? navbarOffset + 20
      : Math.max(insets.bottom, 16) + 96
    : 40;

  const operationKey = `nearby-${effectiveMode}-${filters.radiusKm}-${searchQuery.trim()}-${regionFilter.trim()}`;

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      {/* Campo de Busca Realmente Editável */}
      <View style={styles.searchSection}>
        <TextInput
          ref={searchInputRef}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
          }}
          placeholder="Buscar por nome, bairro ou região..."
          accessibilityLabel="Buscar barbearia por nome ou bairro"
          returnKeyType="search"
          leftIcon={
            <Ionicons
              name="search"
              size={18}
              color={colors.text.secondary}
            />
          }
          rightIcon={
            searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.text.muted}
                />
              </Pressable>
            ) : undefined
          }
        />
      </View>

      {/* Filtros de Raio quando a posição está ativa e autorizada */}
      {hasValidCoordinates && !isServiceUnavailable && (
        <View style={styles.filtersRow}>
          <View style={styles.radiusHeaderRow}>
            <View style={styles.locationBadge}>
              <Ionicons
                name="navigate"
                size={14}
                color={colors.brand.primary}
              />
              <Text
                variant="caption"
                weight="semibold"
                color={colors.text.primary}
              >
                {locationSession.coords?.formattedLocation
                  ? `Próximo a ${locationSession.coords.formattedLocation}`
                  : locationSession.coords?.isApproximate
                    ? 'Sua localização aproximada'
                    : 'Sua localização atual'}
              </Text>
            </View>
          </View>

          <View style={styles.radiusPillsContainer}>
            <Text
              variant="caption"
              weight="medium"
              color={colors.text.secondary}
            >
              Raio:
            </Text>
            <View style={styles.radiusPillsGroup}>
              <Pressable
                onPress={() => {
                  setRegionFilter('');
                  setMode('ALL');
                }}
                accessibilityRole="button"
                accessibilityLabel="Todas as distâncias"
                accessibilityState={{ selected: effectiveMode === 'ALL' }}
                aria-selected={effectiveMode === 'ALL'}
                style={[
                  styles.radiusPill,
                  {
                    borderRadius: radius.md,
                    borderColor:
                      effectiveMode === 'ALL'
                        ? colors.brand.primary
                        : colors.border.subtle,
                    backgroundColor:
                      effectiveMode === 'ALL'
                        ? colors.brand.primary
                        : colors.surface.input,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  weight={effectiveMode === 'ALL' ? 'bold' : 'medium'}
                  color={
                    effectiveMode === 'ALL' ? '#FFFFFF' : colors.text.secondary
                  }
                >
                  Todas
                </Text>
              </Pressable>

              {RADIUS_OPTIONS.map((opt) => {
                const isSelected =
                  filters.radiusKm === opt && effectiveMode === 'NEARBY';
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setRegionFilter('');
                      if (isSelected) {
                        setMode('ALL');
                      } else {
                        setMode('NEARBY');
                        setRadiusKm(opt);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Raio de ${opt} quilômetros`}
                    accessibilityState={{ selected: isSelected }}
                    aria-selected={isSelected}
                    style={[
                      styles.radiusPill,
                      {
                        borderRadius: radius.md,
                        borderColor: isSelected
                          ? colors.brand.primary
                          : colors.border.subtle,
                        backgroundColor: isSelected
                          ? colors.brand.primary
                          : colors.surface.input,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      weight={isSelected ? 'bold' : 'medium'}
                      color={isSelected ? '#FFFFFF' : colors.text.secondary}
                    >
                      {`${opt} km`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Painel de Permissão / Posição Indisponível / Serviço Indisponível */}
      {locationPanelStatus !== 'ready' && (
        <View style={{ marginTop: spacing[3] }}>
          <LocationStatusPanel
            status={locationPanelStatus}
            canAskAgain={canAskAgain}
            onRecoverPermission={handleRecoverPermission}
            onRetryPosition={handleRetryPosition}
            onManualSearch={handleFocusManualSearch}
          />
        </View>
      )}

      {/* Identificação Clara do Contexto da Listagem e Ação Secundária Mapa */}
      <View style={[styles.contextIdentificationRow, { marginTop: spacing[3] }]}>
        <View style={{ flex: 1, marginRight: spacing[2] }}>
          {isProximityActive ? (
            <View style={styles.contextIdentificationInline}>
              <Ionicons
                name="location-sharp"
                size={14}
                color={colors.brand.primary}
              />
              <Text variant="caption" weight="semibold" color={colors.text.secondary}>
                {`Unidades em até ${filters.radiusKm} km${
                  locationSession.coords?.isApproximate ? ' (distância aproximada)' : ''
                }`}
              </Text>
            </View>
          ) : hasValidCoordinates && !isServiceUnavailable && !searchQuery.trim() ? (
            <View style={styles.contextIdentificationInline}>
              <Ionicons
                name="globe-outline"
                size={14}
                color={colors.text.secondary}
              />
              <Text variant="caption" weight="semibold" color={colors.text.secondary}>
                Exibindo todas as barbearias (use os filtros de raio acima para limitar a distância)
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.manualSearchBanner,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : colors.surface.input,
                  borderColor: colors.border.subtle,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={15}
                color={colors.text.secondary}
              />
              <Text
                variant="caption"
                weight="semibold"
                color={colors.text.secondary}
                style={{ flex: 1 }}
              >
                {searchQuery.trim()
                  ? `Busca manual por nome ou bairro: "${searchQuery.trim()}"`
                  : 'Busca manual por nome ou bairro (sem ordenação pela sua posição)'}
              </Text>
            </View>
          )}
        </View>

        {/* Botão Secundário Mapa (min 44x44) */}
        <Button
          variant="outline"
          title="Mapa"
          leftIcon={
            <Ionicons
              name="map-outline"
              size={18}
              color={isMapDisabled ? colors.text.muted : colors.text.primary}
            />
          }
          onPress={() => setIsMapModalVisible(true)}
          disabled={isMapDisabled}
          accessibilityRole="button"
          accessibilityLabel="Abrir visualização de barbearias no mapa"
          style={{ minHeight: 44, minWidth: 88 }}
        />
      </View>

      {/* Explicação honesta quando o botão Mapa estiver desabilitado */}
      {isMapDisabled && (
        <Text
          variant="caption"
          style={{ color: colors.text.muted, marginTop: 4 }}
        >
          {isLoading
            ? 'Carregando estabelecimentos e coordenadas...'
            : 'Nenhuma barbearia com localização disponível para o mapa.'}
        </Text>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.primary },
      ]}
    >
      <View
        style={[
          styles.contentConstraint,
          { paddingHorizontal: isCompact ? 16 : 32 },
        ]}
      >
        {renderHeader()}
      </View>

      <LoadingRegion
        testID="nearby-loading-region"
        operationKey={operationKey}
        active={isLoading}
        phase={isLoading && sanitizedItems.length === 0 ? 'initial' : 'refresh'}
        label="Carregando barbearias"
        hasContent={sanitizedItems.length > 0}
        placeholder={
          <View
            style={[
              styles.contentConstraint,
              { paddingHorizontal: isCompact ? 16 : 32 },
            ]}
          >
            <NearbyResultsSkeleton count={3} />
          </View>
        }
        style={styles.resultsRegion}
        contentStyle={styles.resultsContentWrapper}
      >
        {error && sanitizedItems.length === 0 && !isServiceUnavailable ? (
          <View style={styles.centerBox}>
            <BrandMark
              size={44}
              variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
              decorative
            />
            <Text
              variant="subhead"
              weight="bold"
              color={colors.text.primary}
              align="center"
              style={{ marginTop: spacing[3] }}
            >
              Não foi possível carregar as barbearias
            </Text>
            <Text
              variant="bodySm"
              color={colors.text.secondary}
              align="center"
              style={{ marginTop: spacing[2], maxWidth: 320 }}
            >
              Verifique sua conexão e tente novamente.
            </Text>
            <Button
              variant="primary"
              title="Tentar novamente"
              onPress={() => refetch()}
              style={{ marginTop: spacing[4] }}
            />
          </View>
        ) : sanitizedItems.length === 0 && !isLoading ? (
          <View style={styles.centerBox}>
            <BrandMark size={44} variant="symbol-crimson" decorative />
            <Text
              variant="subhead"
              weight="bold"
              color={colors.text.primary}
              align="center"
              style={{ marginTop: spacing[3] }}
            >
              {searchQuery.trim()
                ? 'Nenhum resultado para sua busca'
                : isProximityActive
                  ? 'Nenhuma barbearia encontrada neste raio'
                  : 'Nenhuma barbearia encontrada'}
            </Text>
            <Text
              variant="bodySm"
              color={colors.text.secondary}
              align="center"
              style={{ marginTop: spacing[2], maxWidth: 320 }}
            >
              {searchQuery.trim()
                ? `Não encontramos unidades para "${searchQuery.trim()}". Tente outro nome ou bairro.`
                : isProximityActive
                  ? `Não há unidades cadastradas a menos de ${filters.radiusKm} km da sua posição.`
                  : 'Use o campo acima para pesquisar pelo nome da barbearia ou bairro.'}
            </Text>

            <View style={[styles.emptyActionsRow, { marginTop: spacing[4] }]}>
              {isProximityActive && filters.radiusKm < 50 && (
                <Button
                  variant="outline"
                  title="Expandir para 50 km"
                  onPress={() => setRadiusKm(50)}
                />
              )}
              {searchQuery.trim().length > 0 && (
                <Button
                  variant="outline"
                  title="Limpar pesquisa"
                  onPress={() => setSearchQuery('')}
                />
              )}
              {isProximityActive && (
                <Button
                  variant="primary"
                  title="Buscar em todas as regiões"
                  onPress={() => setMode('ALL')}
                />
              )}
            </View>
          </View>
        ) : (
          <FlatList
            testID="nearby-flat-list"
            ref={listRef}
            style={styles.resultsList}
            data={sanitizedItems}
            keyExtractor={(item) => item.id}
            onScroll={(e) => {
              scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={styles.contentConstraint}>
                <BarbershopCard
                  shop={item}
                  onPress={() => handleOpenShopCatalog(item)}
                />
              </View>
            )}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListHeaderComponent={
              error && sanitizedItems.length > 0 ? (
                <View
                  style={[
                    styles.inlineErrorBanner,
                    {
                      backgroundColor: colors.surface.elevated,
                      borderColor: colors.border.subtle,
                      borderRadius: radius.md,
                      marginBottom: spacing[3],
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    style={{ flex: 1 }}
                  >
                    Não foi possível atualizar a lista agora. Exibindo resultados já carregados.
                  </Text>
                  <Button
                    variant="outline"
                    title="Tentar novamente"
                    onPress={() => refetch()}
                  />
                </View>
              ) : undefined
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View
                  style={styles.paginationFooter}
                  accessibilityRole="status"
                  accessibilityLiveRegion="polite"
                >
                  <Spinner size="small" color={colors.brand.primary} />
                  <Text variant="caption" color={colors.text.secondary}>
                    Carregando mais barbearias…
                  </Text>
                </View>
              ) : undefined
            }
            contentContainerStyle={{
              paddingHorizontal: isCompact ? 16 : 32,
              paddingTop: 4,
              paddingBottom: bottomPadding,
            }}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={() => {
                  void refetch();
                }}
                tintColor={colors.brand.primary}
              />
            }
          />
        )}
      </LoadingRegion>

      <DiscoveryMapModal
        visible={isMapModalVisible}
        onClose={() => setIsMapModalVisible(false)}
        items={sanitizedItems}
        userCoordinates={hasValidCoordinates ? locationSession.coords : null}
        hasNextPage={hasNextPage}
        onFetchNextPage={fetchNextPage}
        isFetchingNextPage={isFetchingNextPage}
        resultKey={operationKey}
        resultsError={error}
        onRetryResults={() => refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  contentConstraint: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  headerBlock: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchSection: {
    width: '100%',
  },
  filtersRow: {
    marginTop: 12,
    gap: 8,
  },
  radiusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusPillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusPillsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  radiusPill: {
    minHeight: 44,
    minWidth: 52,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextIdentificationRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  contextIdentificationInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  manualSearchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  inlineErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  paginationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  resultsRegion: {
    flex: 1,
    minHeight: 0,
  },
  resultsContentWrapper: {
    flex: 1,
    minHeight: 0,
  },
  resultsList: {
    flex: 1,
    minHeight: 0,
  },
});
