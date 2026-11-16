import React, { useState, useRef, useContext, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, useAdaptiveLayout } from '../../../shared/theme';
import { useAppSafeArea } from '../../../shared/theme/use-app-safe-area';
import { ClientNavbarMetricsContext } from '../../../shared/navigation/ClientNavbarMetrics';
import { useSession } from '../../auth';
import { Text } from '../../../shared/ui/Text';
import { Button } from '../../../shared/ui/Button';
import { LoadingRegion } from '../../../shared/ui/LoadingRegion';
import { Spinner } from '../../../shared/ui/Spinner';
import { BrandMark } from '../../../shared/brand';
import { useNearbyDiscovery } from '../model/use-nearby-discovery';
import { useClientNearbyViewState, } from '../model/use-client-nearby-view-state';
import { locationStore } from '../model/location-provider';
import { buildBarbershopCatalogHref, } from '../api/discovery.contract';
import { BarbershopCard } from './BarbershopCard';
import { NearbyResultsSkeleton } from './NearbyResultsSkeleton';
import { LocationStatusPanel } from './location-status-panel';
import { DiscoveryMapModal } from './DiscoveryMapModal';
import { NearbyDiscoveryHeader } from './nearby-discovery-header';
import { NearbyFiltersSheet } from './nearby-filters-sheet';
import { normalizeNearbyFilterSelection, } from '../model/nearby-filter-selection';
export function ClientNearbyView({ onboardingStage, canAskAgain = true, onRecoverPermission, onRetryPosition, initialMode = 'ALL', initialRadius = 10, initialQuery = '', actorId, }) {
    var _a, _b;
    const { colors, spacing, radius, isDark } = useTheme();
    const { isCompact, isExpanded } = useAdaptiveLayout();
    const insets = useAppSafeArea();
    const navbarOffset = useContext(ClientNavbarMetricsContext);
    const router = useRouter();
    let sessionActorId = null;
    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const session = useSession();
        sessionActorId = (_b = (_a = session.identity) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null;
    }
    catch {
        sessionActorId = null;
    }
    const effectiveActor = actorId !== undefined ? actorId : sessionActorId;
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const { initialState, saveState } = useClientNearbyViewState({
        mode: initialMode,
        radiusKm: initialRadius,
        searchQuery: initialQuery,
        regionFilter: '',
        scrollOffset: 0,
    }, effectiveActor);
    const [regionFilter, setRegionFilter] = useState(initialState.regionFilter);
    const [isMapModalVisible, setIsMapModalVisible] = useState(false);
    const [isFiltersSheetVisible, setIsFiltersSheetVisible] = useState(false);
    const scrollOffsetRef = useRef(initialState.scrollOffset);
    // Troca de ator/sessão fecha superfícies e descarta draft/seleção incompatível
    useEffect(() => {
        setIsMapModalVisible(false);
        setIsFiltersSheetVisible(false);
    }, [effectiveActor]);
    const { filters, effectiveMode, searchQuery, setSearchQuery, setMode, setRadiusKm, items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, isServiceUnavailable, refetch, locationSession, requestLocation, } = useNearbyDiscovery({
        actorId: effectiveActor,
        initialMode: initialState.mode,
        initialRadius: initialState.radiusKm,
        initialQuery: initialState.searchQuery,
    });
    const hasValidCoordinates = locationSession.state === 'granted' && locationSession.coords !== null;
    const isProximityActive = effectiveMode === 'NEARBY' &&
        hasValidCoordinates &&
        !isServiceUnavailable;
    // Preservação contínua de estado no QueryClient por ator
    const currentStateRef = useRef({
        mode: filters.mode,
        radiusKm: filters.radiusKm,
        searchQuery,
        regionFilter,
        scrollOffset: initialState.scrollOffset,
    });
    useEffect(() => {
        currentStateRef.current = {
            mode: filters.mode,
            radiusKm: filters.radiusKm,
            searchQuery,
            regionFilter,
            scrollOffset: scrollOffsetRef.current,
        };
        saveState(currentStateRef.current);
    }, [filters.mode, filters.radiusKm, searchQuery, regionFilter, saveState]);
    useEffect(() => {
        return () => {
            saveState({
                ...currentStateRef.current,
                scrollOffset: scrollOffsetRef.current,
            });
        };
    }, [saveState]);
    // Restauração de scroll com guarda única e respeitando conteúdo
    const hasRestoredScrollRef = useRef(false);
    useEffect(() => {
        if (hasRestoredScrollRef.current)
            return;
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
            }
            catch {
                // no-op
            }
        }
    }, [items.length, isLoading, initialState.scrollOffset]);
    // Resolve status of LocationStatusPanel
    const locationPanelStatus = (() => {
        if (isServiceUnavailable) {
            return 'service_unavailable';
        }
        if (hasValidCoordinates) {
            return 'ready';
        }
        if (onboardingStage === 'denied' ||
            locationSession.state === 'denied') {
            return 'denied';
        }
        if (onboardingStage === 'unavailable' ||
            locationSession.state === 'unavailable' ||
            locationSession.state === 'timeout' ||
            locationSession.state === 'stale') {
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
        }
        else {
            await requestLocation();
        }
        if (locationStoreHasCoords()) {
            setRegionFilter('');
            setMode(filters.mode);
        }
    };
    const handleRetryPosition = async () => {
        if (isServiceUnavailable) {
            setMode(filters.mode);
            refetch();
            return;
        }
        if (onRetryPosition) {
            await onRetryPosition();
        }
        else {
            await requestLocation();
        }
        if (locationStoreHasCoords()) {
            setRegionFilter('');
            setMode(filters.mode);
        }
    };
    function locationStoreHasCoords() {
        const current = locationStore.getSession();
        return (((current.state === 'granted' || current.state === 'stale') &&
            current.coords !== null) ||
            ((locationSession.state === 'granted' || locationSession.state === 'stale') &&
                locationSession.coords !== null));
    }
    const handleFocusManualSearch = () => {
        var _a, _b;
        setMode('ALL');
        (_b = (_a = searchInputRef.current) === null || _a === void 0 ? void 0 : _a.focus) === null || _b === void 0 ? void 0 : _b.call(_a);
    };
    const handleOpenShopCatalog = (shop) => {
        router.push(buildBarbershopCatalogHref(shop.id));
    };
    const handleEndReached = () => {
        if (hasNextPage && !isFetchingNextPage && !isLoading) {
            fetchNextPage();
        }
    };
    const sanitizedItems = items.map((shop) => isProximityActive
        ? shop
        : {
            ...shop,
            distanceMeters: null,
        });
    // Barbearias que possuem coordenadas válidas e finitas (-90..90 lat, -180..180 lng)
    const mappableUnits = useMemo(() => {
        return sanitizedItems.filter((shop) => shop.coordinates &&
            typeof shop.coordinates.latitude === 'number' &&
            Number.isFinite(shop.coordinates.latitude) &&
            shop.coordinates.latitude >= -90 &&
            shop.coordinates.latitude <= 90 &&
            typeof shop.coordinates.longitude === 'number' &&
            Number.isFinite(shop.coordinates.longitude) &&
            shop.coordinates.longitude >= -180 &&
            shop.coordinates.longitude <= 180);
    }, [sanitizedItems]);
    const isMapDisabled = isLoading || mappableUnits.length === 0;
    const bottomPadding = !isExpanded
        ? navbarOffset > 0
            ? navbarOffset + 20
            : Math.max(insets.bottom, 16) + 96
        : 40;
    const operationKey = `nearby-${effectiveMode}-${filters.radiusKm}-${searchQuery.trim()}-${regionFilter.trim()}`;
    // Resumo compacto e verdadeiro dos filtros aplicados
    const headerSummary = useMemo(() => {
        var _a, _b;
        if (isProximityActive && filters.mode === 'ALL') {
            return 'Mais próximas de você · sem limite de distância';
        }
        if (isProximityActive) {
            if ((_a = locationSession.coords) === null || _a === void 0 ? void 0 : _a.formattedLocation) {
                return `Até ${filters.radiusKm} km de ${locationSession.coords.formattedLocation}`;
            }
            return `Até ${filters.radiusKm} km${((_b = locationSession.coords) === null || _b === void 0 ? void 0 : _b.isApproximate) ? ' (distância aproximada)' : ''}`;
        }
        if (hasValidCoordinates && !isServiceUnavailable && !searchQuery.trim()) {
            return 'Todas as distâncias';
        }
        if (searchQuery.trim()) {
            return `Busca manual por nome ou bairro: "${searchQuery.trim()}"`;
        }
        if (isServiceUnavailable) {
            return 'Serviço de proximidade temporariamente indisponível';
        }
        return 'Busca manual por nome ou bairro';
    }, [
        isProximityActive,
        filters.mode,
        filters.radiusKm,
        locationSession.coords,
        hasValidCoordinates,
        isServiceUnavailable,
        searchQuery,
    ]);
    const handleOpenFilters = () => {
        setIsMapModalVisible(false);
        setIsFiltersSheetVisible(true);
    };
    const handleOpenMap = () => {
        setIsFiltersSheetVisible(false);
        setIsMapModalVisible(true);
    };
    const handleApplyFilters = (newSelection) => {
        var _a;
        const normalized = normalizeNearbyFilterSelection(newSelection);
        if (normalized.mode === 'NEARBY') {
            if (locationStoreHasCoords() && !isServiceUnavailable) {
                setRegionFilter('');
                setRadiusKm(normalized.radiusKm);
                setMode('NEARBY');
            }
            else {
                setRegionFilter('');
                setMode('ALL');
            }
        }
        else {
            setRegionFilter('');
            setMode('ALL');
        }
        // Reinicia deliberadamente o offset de scroll ao aplicar novos critérios
        scrollOffsetRef.current = 0;
        saveState({
            ...currentStateRef.current,
            mode: normalized.mode,
            radiusKm: normalized.radiusKm,
            scrollOffset: 0,
        });
        try {
            (_a = listRef.current) === null || _a === void 0 ? void 0 : _a.scrollToOffset({ offset: 0, animated: false });
        }
        catch {
            // no-op
        }
    };
    const renderListHeader = () => (<View style={styles.contentConstraint}>
      <NearbyDiscoveryHeader ref={searchInputRef} searchQuery={searchQuery} onSearchChange={(text) => {
            setSearchQuery(text);
        }} onClearSearch={() => {
            setSearchQuery('');
        }} onOpenFilters={handleOpenFilters} onOpenMap={handleOpenMap} activeFilterCount={isProximityActive && filters.mode === 'NEARBY' ? 1 : 0} summary={headerSummary} mapDisabled={isMapDisabled} mapDisabledReason={isMapDisabled
            ? isLoading
                ? 'Carregando estabelecimentos e coordenadas...'
                : 'Nenhuma barbearia com localização disponível para o mapa.'
            : undefined} notice={<>
            {locationPanelStatus !== 'ready' && (<View style={{ marginTop: spacing[2] }}>
                <LocationStatusPanel status={locationPanelStatus} canAskAgain={canAskAgain} onRecoverPermission={handleRecoverPermission} onRetryPosition={handleRetryPosition} onManualSearch={handleFocusManualSearch}/>
              </View>)}
            {error && sanitizedItems.length > 0 && !isServiceUnavailable && (<View style={[
                    styles.inlineErrorBanner,
                    {
                        backgroundColor: colors.surface.elevated,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.md,
                        marginTop: spacing[2],
                    },
                ]}>
                <Text variant="caption" color={colors.text.secondary} style={{ flex: 1 }}>
                  Não foi possível atualizar a lista agora. Exibindo resultados já carregados.
                </Text>
                <Button variant="outline" title="Tentar novamente" onPress={() => refetch()}/>
              </View>)}
          </>}/>
    </View>);
    const renderEmptyComponent = () => {
        if (isLoading && sanitizedItems.length === 0) {
            return (<View style={[styles.contentConstraint, { marginTop: spacing[4] }]}>
          <NearbyResultsSkeleton count={3}/>
        </View>);
        }
        if (error && sanitizedItems.length === 0 && !isServiceUnavailable) {
            return (<View style={styles.centerBox}>
          <BrandMark size={44} variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'} decorative/>
          <Text variant="subhead" weight="bold" color={colors.text.primary} align="center" style={{ marginTop: spacing[3] }}>
            Não foi possível carregar as barbearias
          </Text>
          <Text variant="bodySm" color={colors.text.secondary} align="center" style={{ marginTop: spacing[2], maxWidth: 320 }}>
            Verifique sua conexão e tente novamente.
          </Text>
          <Button variant="primary" title="Tentar novamente" onPress={() => refetch()} style={{ marginTop: spacing[4] }}/>
        </View>);
        }
        if (sanitizedItems.length === 0 && !isLoading) {
            return (<View style={styles.centerBox}>
          <BrandMark size={44} variant="symbol-crimson" decorative/>
          <Text variant="subhead" weight="bold" color={colors.text.primary} align="center" style={{ marginTop: spacing[3] }}>
            {searchQuery.trim()
                    ? 'Nenhum resultado para sua busca'
                    : isProximityActive && filters.mode === 'NEARBY'
                        ? 'Nenhuma barbearia encontrada neste raio'
                        : 'Nenhuma barbearia encontrada'}
          </Text>
          <Text variant="bodySm" color={colors.text.secondary} align="center" style={{ marginTop: spacing[2], maxWidth: 320 }}>
            {searchQuery.trim()
                    ? `Não encontramos unidades para "${searchQuery.trim()}". Tente outro nome ou bairro.`
                    : isProximityActive && filters.mode === 'NEARBY'
                        ? `Não há unidades cadastradas a menos de ${filters.radiusKm} km da sua posição.`
                        : 'Use o campo acima para pesquisar pelo nome da barbearia ou bairro.'}
          </Text>

          <View style={[styles.emptyActionsRow, { marginTop: spacing[4] }]}>
            {isProximityActive && filters.mode === 'NEARBY' && filters.radiusKm < 50 && (<Button variant="outline" title="Expandir para 50 km" onPress={() => {
                        setRadiusKm(50);
                        scrollOffsetRef.current = 0;
                    }}/>)}
            {searchQuery.trim().length > 0 && (<Button variant="outline" title="Limpar pesquisa" onPress={() => {
                        setSearchQuery('');
                        scrollOffsetRef.current = 0;
                    }}/>)}
            {isProximityActive && filters.mode === 'NEARBY' && (<Button variant="primary" title="Remover limite de distância" onPress={() => {
                        setMode('ALL');
                        scrollOffsetRef.current = 0;
                    }}/>)}
          </View>
        </View>);
        }
        return null;
    };
    const renderFooterComponent = () => {
        if (!isFetchingNextPage)
            return null;
        return (<View style={styles.paginationFooter} accessibilityRole="status" accessibilityLiveRegion="polite">
        <Spinner size="small" color={colors.brand.primary}/>
        <Text variant="caption" color={colors.text.secondary}>
          Carregando mais barbearias…
        </Text>
      </View>);
    };
    return (<View style={[
            styles.container,
            { backgroundColor: colors.background.primary },
        ]}>
      <LoadingRegion testID="nearby-loading-region" operationKey={operationKey} active={isLoading} phase={isLoading && sanitizedItems.length === 0 ? 'initial' : 'refresh'} label="Carregando barbearias" hasContent={true} style={styles.resultsRegion} contentStyle={styles.resultsContentWrapper}>
        <FlatList testID="nearby-flat-list" ref={listRef} style={styles.resultsList} data={sanitizedItems} keyExtractor={(item) => item.id} onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
        }} scrollEventThrottle={16} renderItem={({ item }) => (<View style={styles.contentConstraint}>
              <BarbershopCard shop={item} onPress={() => handleOpenShopCatalog(item)}/>
            </View>)} onEndReached={handleEndReached} onEndReachedThreshold={0.4} ListHeaderComponent={renderListHeader} ListEmptyComponent={renderEmptyComponent} ListFooterComponent={renderFooterComponent} contentContainerStyle={{
            paddingHorizontal: isCompact ? 16 : 32,
            paddingTop: 4,
            paddingBottom: bottomPadding,
        }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => {
                void refetch();
            }} tintColor={colors.brand.primary}/>}/>
      </LoadingRegion>

      <NearbyFiltersSheet visible={isFiltersSheetVisible} value={{
            mode: filters.mode,
            radiusKm: filters.radiusKm,
        }} isLocationAvailable={hasValidCoordinates} locationStatus={locationPanelStatus} canAskAgain={canAskAgain} scopeKey={effectiveActor !== null && effectiveActor !== void 0 ? effectiveActor : 'anonymous'} onClose={() => setIsFiltersSheetVisible(false)} onApply={handleApplyFilters} onRecoverPermission={handleRecoverPermission} onRetryPosition={handleRetryPosition} onManualSearch={handleFocusManualSearch}/>

      <DiscoveryMapModal visible={isMapModalVisible} onClose={() => setIsMapModalVisible(false)} items={sanitizedItems} userCoordinates={hasValidCoordinates ? locationSession.coords : null} hasNextPage={hasNextPage} onFetchNextPage={fetchNextPage} isFetchingNextPage={isFetchingNextPage} resultKey={operationKey} scopeKey={effectiveActor !== null && effectiveActor !== void 0 ? effectiveActor : 'anonymous'} resultsError={error} onRetryResults={() => refetch()}/>
    </View>);
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
