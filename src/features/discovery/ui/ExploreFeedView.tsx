import { ClientNavbarMetricsContext } from '@/shared/navigation/ClientNavbarMetrics';
import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions, Platform } from 'react-native';

interface ViewToken {
  item: any;
  key: string;
  index?: number | null;
  isViewable: boolean;
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { BrandMark } from '@/shared/brand';
import { useExploreFeed } from '../model/use-explore-feed';
import { ExploreFeedSlide } from './ExploreFeedSlide';
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
}

export function ExploreFeedView({ initialMode, initialRadius }: ExploreFeedViewProps) {
  const { colors, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const measuredNavbar=useContext(ClientNavbarMetricsContext);
  const [containerWidth,setContainerWidth]=useState(windowWidth);
  const photoPositions=useRef(new Map<string,number>());
  const rememberPhoto=useCallback((id:string,index:number)=>{photoPositions.current.set(id,index);},[]);
  const [containerHeight, setContainerHeight] = useState(windowHeight);

  // Bottom inset consideration for floating capsule bar (approx 64px) + safe area
  const bottomInset = Math.max(measuredNavbar,insets.bottom+12);
  const topInset = insets.top;

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
  const onVisible = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((item) => item.isViewable);
    if (first?.index != null) setActiveIndex(first.index);
  }).current;
  const visibility = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const flatListRef = useRef<FlatList<ExploreFeedItem>>(null);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    setActiveIndex(0);
  }, [mode, radiusKm, searchQuery, locationSession.generationId, regionKey]);

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
        isActive={index === activeIndex && activeSheet === null}
        isNear={Math.abs(index - activeIndex) <= 1}
        initialPhotoIndex={photoPositions.current.get(item.barbershop.id)??0}
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
      activeIndex,
      activeSheet,
      containerWidth,rememberPhoto,
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

  const activeIndexRef=useRef(activeIndex);activeIndexRef.current=activeIndex;
  useEffect(()=>{flatListRef.current?.scrollToOffset({offset:activeIndexRef.current*stageHeight,animated:false});},[stageHeight,containerWidth]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#0a0a0a' }]}>
        <BrandMark size={56} variant="symbol-crimson" decorative />
        <View style={{ marginTop: 20 }}>
          <Spinner size="large" />
        </View>
        <Text style={[styles.loadingText, { color: '#e0e0e0' }]}>
          Carregando experiências do Explorar...
        </Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#0a0a0a', padding: 24 }]}>
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
        <Button variant="outline" title="Ver todas as regiões" onPress={()=>{setMode('ALL');setRegionKey('');setSearchQuery('');if(mode==='ALL')refetch();}} style={{marginTop:12}}/>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: '#0a0a0a', padding: 24 }]}>
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
      style={styles.container}
      onLayout={(e) => {
        const layoutWidth=e.nativeEvent.layout.width;if(layoutWidth>0)setContainerWidth(layoutWidth);
        const layoutHeight = e.nativeEvent.layout.height;
        if (layoutHeight > 0 && Math.abs(layoutHeight - containerHeight) > 1) {
          setContainerHeight(layoutHeight);
        }
      }}
    >
      <FlatList
        ref={flatListRef}
        data={items}
        onViewableItemsChanged={onVisible}
        viewabilityConfig={visibility}
        renderItem={renderItem}
        keyExtractor={(item) => item.barbershop.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={stageHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={getItemLayout}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={Platform.OS !== 'web'}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        style={StyleSheet.absoluteFill}
      />

      {error && items.length > 0 && (
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

      {isProximityUnavailable && (
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
        visible={activeSheet === 'service'}
        item={selectedItem}
        activeMedia={selectedMedia}
        onClose={handleCloseSheet}
      />

      <ExploreCatalogSheet
        visible={activeSheet === 'catalog'}
        item={selectedItem}
        onClose={handleCloseSheet}
      />

      <ExploreAboutSheet
        visible={activeSheet === 'about'}
        item={selectedItem}
        onClose={handleCloseSheet}
      />

      <ExploreReviewsSheet
        visible={activeSheet === 'reviews'}
        item={selectedItem}
        onClose={handleCloseSheet}
      />

      <ExploreFilterSheet
        visible={activeSheet === 'filters'}
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
