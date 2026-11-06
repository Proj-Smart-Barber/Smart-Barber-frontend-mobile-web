import { ClientNavbarMetricsContext } from '@/shared/navigation/ClientNavbarMetrics';
import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions, Platform } from 'react-native';

interface ViewToken {
  item: any;
  key: string;
  index?: number | null;
  isViewable: boolean;
}
import { useTheme } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { LoadingRegion } from '@/shared/ui';
import { BrandMark } from '@/shared/brand';
import { useExploreFeed } from '../model/use-explore-feed';
import type { ActiveClientMedia } from '../model/client-experience-context';
import { ExploreFeedSlide } from './ExploreFeedSlide';
import { ExploreFeedSkeleton } from './ExploreFeedSkeleton';
import {
  ExploreServiceSheet,
  ExploreCatalogSheet,
  ExploreAboutSheet,
  ExploreReviewsSheet,
  ExploreFilterSheet,
} from './ExploreSheets';
import type { ExploreFeedItem, ExploreFeedMediaItem } from '../api/explore-feed.contract';
import type { DiscoveryMode, DiscoveryRadius } from '../model/discovery.types';

export interface ExploreFeedViewProps {
  initialMode?: DiscoveryMode;
  initialRadius?: DiscoveryRadius;
  isVisible?: boolean;
  topOffset?: number;
  onActiveMediaChange?: (value: ActiveClientMedia | null) => void;
}

export function ExploreFeedView({
  initialMode,
  initialRadius,
  isVisible = true,
  topOffset,
  onActiveMediaChange,
}: ExploreFeedViewProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useAppSafeArea();

  const measuredNavbar = useContext(ClientNavbarMetricsContext);
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const [photoIndexByShop, setPhotoIndexByShop] = useState<Record<string, number>>({});
  const photoPositions = useRef(new Map<string, number>());

  const rememberPhoto = useCallback((id: string, index: number) => {
    photoPositions.current.set(id, index);
    setPhotoIndexByShop((prev) =>
      prev[id] === index ? prev : { ...prev, [id]: index },
    );
  }, []);

  const [containerHeight, setContainerHeight] = useState(windowHeight);

  // Bottom inset consideration for floating capsule bar (approx 64px) + safe area
  const bottomInset = Math.max(
    measuredNavbar,
    insets.bottom > 0 ? Math.min(insets.bottom, 12) : 8,
  );
  const topInset =
    topOffset !== undefined ? topOffset : insets.top > 0 ? insets.top + 8 : 16;

  const stageHeight = containerHeight > 0 ? containerHeight : windowHeight;

  const {
    items,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    mode,
    radiusKm,
    searchQuery,
    regionKey,
    setRegionKey,
    locationSession,
    isProximityUnavailable,
    fetchNextPage,
    refetch,
    setMode,
    setRadius,
    setSearchQuery,
  } = useExploreFeed({
    initialMode,
    initialRadius,
  });

  // Active sheets state
  const [activeSheet, setActiveSheet] = useState<
    'service' | 'catalog' | 'about' | 'reviews' | 'filters' | null
  >(null);
  const [selectedItem, setSelectedItem] = useState<ExploreFeedItem | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<ExploreFeedMediaItem | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeShopIdRef = useRef<string | null>(null);
  const isVisibleRef = useRef(isVisible);
  isVisibleRef.current = isVisible;

  const onVisible = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!isVisibleRef.current) return;
    const first = viewableItems.find((item) => item.isViewable);
    if (first?.index != null) {
      setActiveIndex(first.index);
      if (first.item?.barbershop?.id) {
        activeShopIdRef.current = first.item.barbershop.id;
      }
    }
  }).current;
  const visibility = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const flatListRef = useRef<FlatList<ExploreFeedItem>>(null);

  // Restore by valid shop/media when results change, avoiding showing another barbershop under old context
  useEffect(() => {
    if (items.length === 0) {
      if (activeIndex !== 0) setActiveIndex(0);
      activeShopIdRef.current = null;
      return;
    }

    const currentShopId = activeShopIdRef.current;
    if (currentShopId) {
      const foundIndex = items.findIndex((it) => it.barbershop.id === currentShopId);
      if (foundIndex >= 0) {
        if (foundIndex !== activeIndex) {
          setActiveIndex(foundIndex);
        }
        return;
      }
    }

    if (activeIndex >= items.length) {
      setActiveIndex(0);
      activeShopIdRef.current = items[0]?.barbershop.id ?? null;
    } else {
      activeShopIdRef.current = items[activeIndex]?.barbershop.id ?? null;
    }
  }, [items, activeIndex]);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    setActiveIndex(0);
    activeShopIdRef.current = null;
  }, [mode, radiusKm, searchQuery, locationSession.generationId, regionKey]);

  // Publish active media to ClientExperienceContext when visible; publish null when hidden or empty
  const onActiveMediaChangeRef = useRef(onActiveMediaChange);
  onActiveMediaChangeRef.current = onActiveMediaChange;

  useEffect(() => {
    const callback = onActiveMediaChangeRef.current;
    if (!callback) return;

    if (!isVisible || items.length === 0) {
      callback(null);
      return;
    }

    const currentItem = items[activeIndex] ?? items[0];
    if (!currentItem || !currentItem.barbershop?.id) {
      callback(null);
      return;
    }

    const shopId = currentItem.barbershop.id;
    const photos = currentItem.media.length > 0 ? currentItem.media : [];
    if (photos.length === 0) {
      callback(null);
      return;
    }

    const storedPhotoIdx =
      photoIndexByShop[shopId] ?? photoPositions.current.get(shopId) ?? 0;
    const validPhotoIdx = Math.max(0, Math.min(storedPhotoIdx, photos.length - 1));
    const currentMedia = photos[validPhotoIdx] ?? null;

    if (!currentMedia) {
      callback(null);
      return;
    }

    // Only associate service when media kind is 'service' and service object is present
    const realService =
      currentMedia.kind === 'service' && currentMedia.service
        ? {
            id: currentMedia.service.id,
            title: currentMedia.service.title,
            priceInCents: currentMedia.service.priceInCents,
            durationInMinutes: currentMedia.service.durationInMinutes,
          }
        : null;

    callback({
      shopId,
      shopName: currentItem.barbershop.name,
      mediaId: currentMedia.id,
      service: realService,
    });
  }, [isVisible, items, activeIndex, photoIndexByShop]);

  useEffect(() => {
    return () => {
      onActiveMediaChangeRef.current?.(null);
    };
  }, []);

  // Close active sheets if feed becomes hidden
  useEffect(() => {
    if (!isVisible && activeSheet !== null) {
      setActiveSheet(null);
    }
  }, [isVisible, activeSheet]);

  const handleOpenService = useCallback(
    (item: ExploreFeedItem, activeMedia: ExploreFeedMediaItem) => {
      setSelectedItem(item);
      setSelectedMedia(activeMedia);
      setActiveSheet('service');
    },
    [],
  );

  const handleOpenCatalog = useCallback((item: ExploreFeedItem) => {
    setSelectedItem(item);
    setActiveSheet('catalog');
  }, []);

  const handleOpenAbout = useCallback((item: ExploreFeedItem) => {
    setSelectedItem(item);
    setActiveSheet('about');
  }, []);

  const handleOpenReviews = useCallback((item: ExploreFeedItem) => {
    setSelectedItem(item);
    setActiveSheet('reviews');
  }, []);

  const handleOpenFilters = useCallback(() => {
    setActiveSheet('filters');
  }, []);

  const handleCloseSheet = useCallback(() => {
    setActiveSheet(null);
  }, []);

  const handleApplyFilters = useCallback(
    (newMode: DiscoveryMode, newRadius: DiscoveryRadius, newQuery: string, newRegion?: string) => {
      setRegionKey(newRegion ?? '');
      setMode(newMode);
      setRadius(newRadius);
      setSearchQuery(newQuery);
    },
    [setMode, setRadius, setSearchQuery, setRegionKey],
  );

  const locationLabel = regionKey
    ? `Região: ${regionKey}`
    : mode === 'NEARBY' && locationSession.state === 'granted' && locationSession.coords
      ? locationSession.coords.formattedLocation || 'Perto de você'
      : mode === 'NEARBY'
        ? 'Perto de você'
        : 'Todas as regiões';

  const renderItem = useCallback(
    ({ item, index }: { item: ExploreFeedItem; index: number }) => (
      <ExploreFeedSlide
        item={item}
        isActive={isVisible && index === activeIndex && activeSheet === null}
        isNear={isVisible && Math.abs(index - activeIndex) <= 1}
        initialPhotoIndex={photoPositions.current.get(item.barbershop.id) ?? 0}
        onPhotoIndexChange={rememberPhoto}
        width={containerWidth}
        height={stageHeight}
        bottomInset={bottomInset}
        topInset={topInset}
        locationLabel={locationLabel}
        onOpenService={handleOpenService}
        onOpenCatalog={handleOpenCatalog}
        onOpenAbout={handleOpenAbout}
        onOpenReviews={handleOpenReviews}
        onOpenFilters={handleOpenFilters}
      />
    ),
    [
      isVisible,
      activeIndex,
      activeSheet,
      containerWidth,
      rememberPhoto,
      stageHeight,
      bottomInset,
      topInset,
      locationLabel,
      handleOpenService,
      handleOpenCatalog,
      handleOpenAbout,
      handleOpenReviews,
      handleOpenFilters,
    ],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: stageHeight,
      offset: stageHeight * index,
      index,
    }),
    [stageHeight],
  );

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  useEffect(() => {
    if (stageHeight > 0 && containerWidth > 0) {
      flatListRef.current?.scrollToOffset({
        offset: activeIndexRef.current * stageHeight,
        animated: false,
      });
    }
  }, [stageHeight, containerWidth]);

  const handleEndReached = useCallback(() => {
    if (!isVisible) return;
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleLayout = useCallback(
    (e: any) => {
      if (!isVisible) return;
      const layoutWidth = e.nativeEvent.layout.width;
      const layoutHeight = e.nativeEvent.layout.height;
      // Ignore zero or invalid dimensions from a hidden container
      if (layoutWidth > 0) {
        setContainerWidth(layoutWidth);
      }
      if (layoutHeight > 0 && Math.abs(layoutHeight - containerHeight) > 1) {
        setContainerHeight(layoutHeight);
      }
    },
    [isVisible, containerHeight],
  );

  if (isLoading && items.length === 0) {
    return (
      <View
        style={[styles.container, !isVisible && styles.hiddenContainer]}
        pointerEvents={isVisible ? 'auto' : 'none'}
        aria-hidden={!isVisible}
        accessibilityElementsHidden={!isVisible}
        importantForAccessibility={isVisible ? 'auto' : 'no-hide-descendants'}
        onLayout={handleLayout}
      >
        {isVisible && (
          <LoadingRegion
            phase="initial"
            busy={true}
            accessibilityLabel="Carregando experiências do feed Explorar"
            placeholder={
              <ExploreFeedSkeleton
                width={containerWidth}
                height={stageHeight}
                bottomInset={bottomInset}
                topInset={topInset}
              />
            }
            style={{ flex: 1 }}
          />
        )}
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: '#0a0a0a', padding: 24 },
          !isVisible && styles.hiddenContainer,
        ]}
        pointerEvents={isVisible ? 'auto' : 'none'}
        aria-hidden={!isVisible}
        accessibilityElementsHidden={!isVisible}
        importantForAccessibility={isVisible ? 'auto' : 'no-hide-descendants'}
      >
        <BrandMark size={48} variant="symbol-ivory" decorative />
        <Text style={styles.errorTitle}>Não foi possível carregar o feed</Text>
        <Text style={styles.errorSubtext}>
          {error.message || 'Erro de conexão ou serviço indisponível.'}
        </Text>
        <Button
          variant="primary"
          title="Tentar novamente"
          onPress={refetch}
          style={{ marginTop: 20 }}
        />
        <Button
          variant="outline"
          title="Ver todas as regiões"
          onPress={() => {
            setMode('ALL');
            setRegionKey('');
            setSearchQuery('');
            if (mode === 'ALL') refetch();
          }}
          style={{ marginTop: 12 }}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: '#0a0a0a', padding: 24 },
          !isVisible && styles.hiddenContainer,
        ]}
        pointerEvents={isVisible ? 'auto' : 'none'}
        aria-hidden={!isVisible}
        accessibilityElementsHidden={!isVisible}
        importantForAccessibility={isVisible ? 'auto' : 'no-hide-descendants'}
      >
        <BrandMark size={48} variant="symbol-crimson" decorative />
        <Text style={styles.emptyTitle}>Nenhuma barbearia encontrada</Text>
        <Text style={styles.emptySubtext}>
          {mode === 'NEARBY'
            ? `Não encontramos barbearias a menos de ${radiusKm} km. Tente expandir seu raio ou ver todas as unidades.`
            : 'Nenhum resultado para os termos pesquisados. Tente ajustar os filtros.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          {mode === 'NEARBY' && (
            <Button variant="outline" title="Expandir para 50 km" onPress={() => setRadius(50)} />
          )}
          <Button
            variant="primary"
            title="Ver todas disponíveis"
            onPress={() => {
              setMode('ALL');
              setSearchQuery('');
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, !isVisible && styles.hiddenContainer]}
      pointerEvents={isVisible ? 'auto' : 'none'}
      aria-hidden={!isVisible}
      accessibilityElementsHidden={!isVisible}
      importantForAccessibility={isVisible ? 'auto' : 'no-hide-descendants'}
      onLayout={handleLayout}
    >
      <FlatList
        ref={flatListRef}
        data={items}
        onViewableItemsChanged={onVisible}
        viewabilityConfig={visibility}
        renderItem={renderItem}
        keyExtractor={(item) => item.barbershop.id}
        pagingEnabled
        scrollEnabled={isVisible}
        showsVerticalScrollIndicator={false}
        snapToInterval={stageHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onEndReached={isVisible ? handleEndReached : undefined}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        style={StyleSheet.absoluteFill}
      />

      {isVisible && isFetchingNextPage && (
        <View
          style={{
            position: 'absolute',
            bottom: bottomInset + 12,
            alignSelf: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            zIndex: 30,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
          accessibilityRole="status"
          accessibilityLiveRegion="polite"
        >
          <Spinner size="small" />
          <Text style={{ color: '#fff', fontSize: 12 }}>Carregando mais experiências…</Text>
        </View>
      )}

      {isVisible && error && items.length > 0 && (
        <View
          style={{
            position: 'absolute',
            top: Math.max(topInset, 16) + 75,
            left: 16,
            right: 16,
            backgroundColor: '#171719',
            padding: 12,
            zIndex: 20,
          }}
        >
          <Text style={{ color: '#fff' }}>Não foi possível continuar esta sessão do feed.</Text>
          <Button
            title="Atualizar feed"
            onPress={() => {
              setActiveIndex(0);
              refetch();
            }}
          />
        </View>
      )}

      {isVisible && isProximityUnavailable && (
        <View
          style={{
            position: 'absolute',
            top: Math.max(topInset, 16) + 16,
            left: 16,
            right: 16,
            backgroundColor: 'rgba(23, 23, 25, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            zIndex: 25,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
              Busca por proximidade indisponível
            </Text>
            <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>
              Exibindo catálogo geral sem ordenação por distância.
            </Text>
          </View>
          <Button
            variant="outline"
            title="Tentar GPS"
            style={{ paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 }}
            onPress={() => setMode('NEARBY')}
          />
        </View>
      )}

      {/* Sheets Interativos */}
      <ExploreServiceSheet
        visible={isVisible && activeSheet === 'service'}
        item={selectedItem}
        activeMedia={selectedMedia}
        onClose={handleCloseSheet}
      />

      <ExploreCatalogSheet
        visible={isVisible && activeSheet === 'catalog'}
        item={selectedItem}
        onClose={handleCloseSheet}
      />

      <ExploreAboutSheet
        visible={isVisible && activeSheet === 'about'}
        item={selectedItem}
        onClose={handleCloseSheet}
      />

      <ExploreReviewsSheet
        visible={isVisible && activeSheet === 'reviews'}
        item={selectedItem}
        onClose={handleCloseSheet}
      />

      <ExploreFilterSheet
        visible={isVisible && activeSheet === 'filters'}
        mode={mode}
        radiusKm={radiusKm}
        searchQuery={searchQuery}
        regionKey={regionKey}
        isLocationGranted={locationSession.state === 'granted'}
        onClose={handleCloseSheet}
        onApplyFilters={handleApplyFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    position: 'relative',
  },
  hiddenContainer: {
    opacity: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#a0a0a0',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#b0b0b0',
    fontSize: 13.5,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});
