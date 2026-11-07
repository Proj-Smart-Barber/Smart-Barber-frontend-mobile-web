import React, { useState, useRef, useCallback, lazy, Suspense, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/shared/theme';
import { BrandMark } from '@/shared/brand';
import type { ExploreFeedItem, ExploreFeedMediaItem } from '../api/explore-feed.contract';
import { getVisibleMediaIndex } from '../lib/gallery-media-index';

const ExploreVideo = lazy(() =>
  import('./ExploreVideo').then((module) => ({ default: module.ExploreVideo })),
);

export interface ExploreFeedSlideProps {
  item: ExploreFeedItem;
  initialPhotoIndex?: number;
  onPhotoIndexChange?: (id: string, index: number) => void;
  isActive?: boolean;
  isNear?: boolean;
  width: number;
  height: number;
  bottomInset: number;
  topInset: number;
  locationLabel?: string;
  onOpenService: (item: ExploreFeedItem, activeMedia: ExploreFeedMediaItem) => void;
  onOpenCatalog: (item: ExploreFeedItem) => void;
  onOpenAbout: (item: ExploreFeedItem) => void;
  onOpenReviews: (item: ExploreFeedItem) => void;
  onOpenFilters?: () => void;
}

export function ExploreFeedSlide({
  item,
  initialPhotoIndex=0,
  onPhotoIndexChange,
  isActive = true,
  isNear = true,
  width,
  height,
  bottomInset,
  topInset,
  locationLabel,
  onOpenService,
  onOpenCatalog,
  onOpenAbout,
  onOpenReviews,
  onOpenFilters,
}: ExploreFeedSlideProps) {
  const { colors } = useTheme();
  const [activePhotoIndex, setActivePhotoIndex] = useState(initialPhotoIndex);
  const activePhotoIndexRef = useRef(initialPhotoIndex);
  activePhotoIndexRef.current = activePhotoIndex;
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const photos = item.media.length > 0 ? item.media : [];
  const activeMedia = photos[activePhotoIndex] || null;

  const photoScroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  // Sincroniza estado inicial seguro quando item ou fotos mudam
  useEffect(() => {
    const boundedInitial = Math.max(0, Math.min(initialPhotoIndex, Math.max(0, photos.length - 1)));
    if (boundedInitial !== activePhotoIndexRef.current) {
      activePhotoIndexRef.current = boundedInitial;
      setActivePhotoIndex(boundedInitial);
    }
  }, [initialPhotoIndex, photos.length, item.barbershop.id]);

  // Restaura posição no mount, troca de barbearia ou resize (sem reentrância a cada gesto de rolagem)
  useEffect(() => {
    if (width > 0 && photos.length > 0) {
      const targetX = activePhotoIndexRef.current * width;
      photoScroll.current?.scrollTo({ x: targetX, animated: false });
    }
  }, [width, item.barbershop.id]);

  const handleScrollUpdate = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent?.contentOffset?.x ?? 0;
      const nextIndex = getVisibleMediaIndex(offsetX, width, photos.length);
      if (nextIndex !== activePhotoIndexRef.current) {
        activePhotoIndexRef.current = nextIndex;
        setActivePhotoIndex(nextIndex);
        onPhotoIndexChange?.(item.barbershop.id, nextIndex);
      }
    },
    [width, photos.length, onPhotoIndexChange, item.barbershop.id],
  );

  const formattedDistance =
    item.distanceMeters !== null && Number.isFinite(item.distanceMeters)
      ? `${(item.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`
      : null;

  const ratingText =
    item.barbershop.rating !== null && item.barbershop.rating !== undefined
      ? `★ ${item.barbershop.rating.toFixed(1).replace('.', ',')} (${item.barbershop.reviewCount})`
      : 'Sem avaliações';

  return (
    <View style={[styles.container, { width, height }]}>
      {/* 1. Carrossel Horizontal de Fotos do Estabelecimento */}
      {photos.length > 0 ? (
        <ScrollView
          testID="explore-photo-scroll"
          ref={photoScroll}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScrollUpdate}
          onMomentumScrollEnd={handleScrollUpdate}
          onScrollEndDrag={handleScrollUpdate}
          scrollEventThrottle={16}
          style={StyleSheet.absoluteFill}
        >
          {photos.map((media, index) => {
            const hasError = imageErrorMap[media.id];
            return (
              <View key={media.id} style={[styles.photoStage, { width, height }]}>
                {!hasError ? (
                  media.mimeType?.startsWith('video/') ? (
                    isActive && index === activePhotoIndex ? (
                      <Suspense fallback={<View style={StyleSheet.absoluteFill} />}>
                        <ExploreVideo url={media.url} poster={media.posterUrl} active={isActive} />
                      </Suspense>
                    ) : media.posterUrl ? (
                      <Image
                        source={{ uri: media.posterUrl }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    ) : null
                  ) : isNear && Math.abs(index - activePhotoIndex) <= 1 ? (
                    <Image
                      source={{ uri: media.url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      onError={() => {
                        setImageErrorMap((prev) => ({ ...prev, [media.id]: true }));
                      }}
                      accessibilityLabel={media.alt}
                    />
                  ) : null
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.placeholderStage]}>
                    <BrandMark size={56} variant="symbol-crimson" decorative />
                    <Text style={styles.placeholderText}>The Obsidian Atelier</Text>
                    <Text style={styles.placeholderSubtext}>
                      Imagem demonstrativa em atualização
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholderStage]}>
          <BrandMark size={56} variant="symbol-crimson" decorative />
          <Text style={styles.placeholderText}>The Obsidian Atelier</Text>
        </View>
      )}

      {/* 2. Gradientes Suaves Superior e Inferior para Leitura sobre Mídia */}
      <LinearGradient
        colors={['rgba(10, 10, 14, 0.72)', 'rgba(10, 10, 14, 0.32)', 'transparent']}
        locations={[0, 0.55, 1]}
        style={[styles.topScrim, { height: Math.max(topInset, 16) + 36 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(10, 10, 14, 0.48)', 'rgba(10, 10, 14, 0.88)']}
        locations={[0, 0.45, 1]}
        style={[styles.bottomScrim, { height: bottomInset + 180 }]}
        pointerEvents="none"
      />

      {/* 3. Trilho de Ações à Direita: Detalhes, Catálogo, Sobre */}
      <View style={[styles.actionRail, { bottom: bottomInset + 12 }]}>
        {/* Ação: Detalhes / Serviços (papel secundário em vidro, sem competir com o CTA central Agendar) */}
        <Pressable
          onPress={() => activeMedia?.service ? onOpenService(item, activeMedia) : onOpenCatalog(item)}
          style={styles.railActionItem}
          accessibilityRole="button"
          accessibilityLabel={
            activeMedia?.service
              ? 'Ver detalhes do serviço'
              : 'Ver serviços da barbearia'
          }
        >
          <View style={styles.railActionButtonGlass}>
            <Ionicons name="cut-outline" size={20} color="#ffffff" />
          </View>
          <Text style={styles.railActionLabel}>
            {activeMedia?.service ? 'Detalhes' : 'Serviços'}
          </Text>
        </Pressable>

        {/* Ação: Catálogo */}
        <Pressable
          onPress={() => onOpenCatalog(item)}
          style={styles.railActionItem}
          accessibilityRole="button"
          accessibilityLabel="Abrir catálogo completo de serviços da barbearia"
        >
          <View style={styles.railActionButtonGlass}>
            <Ionicons name="book-outline" size={20} color="#ffffff" />
          </View>
          <Text style={styles.railActionLabel}>Catálogo</Text>
        </Pressable>

        {/* Ação: Sobre */}
        <Pressable
          onPress={() => onOpenAbout(item)}
          style={styles.railActionItem}
          accessibilityRole="button"
          accessibilityLabel="Ver sobre a barbearia, endereço e mapa"
        >
          <View style={styles.railActionButtonGlass}>
            <Ionicons name="information-circle-outline" size={22} color="#ffffff" />
          </View>
          <Text style={styles.railActionLabel}>Sobre</Text>
        </Pressable>
      </View>

      {/* 5. Legenda Inferior Esquerda: Logo + Nome + Avaliação + Serviço/Ambiente + Dots */}
      <View style={[styles.bottomCaption, { bottom: bottomInset + 12 }]}>
        {/* Identificação da Barbearia */}
        <View style={styles.captionHeaderRow}>
          {item.barbershop.logoUrl ? (
            <Image
              source={{ uri: item.barbershop.logoUrl }}
              style={styles.shopLogo}
              resizeMode="contain"
              accessibilityLabel={`Logo da ${item.barbershop.name}`}
            />
          ) : (
            <View style={styles.shopLogoFallback}>
              <BrandMark size={22} variant="symbol-ivory" decorative />
            </View>
          )}

          <View style={styles.shopInfoColumn}>
            <Text style={styles.shopName} numberOfLines={1}>
              {item.barbershop.name}
            </Text>
            <Text style={styles.shopLocation} numberOfLines={1}>
              {item.barbershop.location}
            </Text>
          </View>
        </View>

        {/* Linha de Avaliação e Distância (Acionável para ver reviews) */}
        <Pressable
          onPress={() => onOpenReviews(item)}
          style={styles.ratingDistanceRow}
          accessibilityRole="button"
          accessibilityLabel={`Avaliação ${ratingText}. Toque para ver avaliações publicadas.`}
        >
          <View style={styles.ratingRowContainer}>
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text style={styles.ratingText}>
              {item.barbershop.rating !== null && item.barbershop.rating !== undefined
                ? `${item.barbershop.rating.toFixed(1).replace('.', ',')} (${item.barbershop.reviewCount})`
                : 'Sem avaliações'}
            </Text>
            {formattedDistance && (
              <>
                <Text style={styles.separatorBullet}>•</Text>
                <Ionicons name="location-sharp" size={12} color="#cbd5e1" />
                <Text style={styles.distanceText}>{formattedDistance}</Text>
              </>
            )}
          </View>
        </Pressable>

        {/* Detalhe da Foto: Se for Serviço, mostra Título/Preço/Duração; se for Ambiente, mostra Espaço */}
        {activeMedia?.kind === 'service' && activeMedia.service ? (
          <View style={styles.serviceDetailBox}>
            <Text style={styles.serviceTitle} numberOfLines={1}>
              {activeMedia.service.title}
            </Text>
            <Text style={styles.servicePriceDuration}>
              {`R$ ${(activeMedia.service.priceInCents / 100).toFixed(2).replace('.', ',')} • ${activeMedia.service.durationInMinutes} min`}
            </Text>
            <Text style={styles.illustrativeNotice}>Imagens e dados ilustrativos</Text>
          </View>
        ) : (
          <View style={styles.serviceDetailBox}>
            <Text style={styles.serviceTitle} numberOfLines={1}>
              Ambiente da Barbearia
            </Text>
            <Text style={styles.servicePriceDuration}>Estrutura e instalações do espaço</Text>
            <Text style={styles.illustrativeNotice}>
              {activeMedia?.rightsPending
                ? 'Imagens ilustrativas • procedência em revisão'
                : 'Imagens e dados ilustrativos'}
            </Text>
          </View>
        )}

        {/* Indicadores de Posição Fotográfica (dots / pill) */}
        {photos.length > 1 && (
          <View style={styles.indicatorsRow}>
            {photos.map((_, idx) => (
              <View
                key={`dot-${idx}`}
                style={[
                  styles.indicatorDot,
                  idx === activePhotoIndex
                    ? [styles.indicatorPillActive, { backgroundColor: colors.brand.primary }]
                    : styles.indicatorDotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    position: 'relative',
    overflow: 'hidden',
  },
  photoStage: {
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderStage: {
    backgroundColor: '#121214',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  placeholderSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  indicatorDot: {
    height: 5,
    borderRadius: 2.5,
  },
  indicatorDotInactive: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  indicatorPillActive: {
    width: 16,
  },
  actionRail: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    gap: 14,
    zIndex: 10,
  },
  railActionItem: {
    alignItems: 'center',
    gap: 3,
  },
  railActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  railActionButtonPrimary: {
    backgroundColor: '#b8141b',
  },
  railActionButtonGlass: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(24, 24, 27, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  railActionLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomCaption: {
    position: 'absolute',
    left: 18,
    right: 76,
    zIndex: 10,
    gap: 4,
  },
  captionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shopLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: '#18181b',
  },
  shopLogoFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopInfoColumn: {
    flex: 1,
    minWidth: 0,
  },
  shopName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shopLocation: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '400',
  },
  ratingDistanceRow: {
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  ratingRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  separatorBullet: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  distanceText: {
    color: '#e2e8f0',
    fontSize: 12.5,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  serviceDetailBox: {
    gap: 1,
    marginTop: 2,
  },
  serviceTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  servicePriceDuration: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 13.5,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  illustrativeNotice: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 10.5,
    fontWeight: '400',
    marginTop: 2,
  },
});
