import React, { useState, useMemo } from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { BrandMark } from '@/shared/brand';

export interface BarbershopPhotoCarouselProps {
  photos?: string[];
  coverUrl?: string | null;
  barbershopName: string;
  height?: number;
  maxPhotos?: number;
  onPress?: () => void;
  onPhotoPress?: (photoUrl: string, index: number) => void;
  style?: any;
}

export function BarbershopPhotoCarousel({
  photos,
  coverUrl,
  barbershopName,
  height = 175,
  maxPhotos = 3,
  onPress,
  onPhotoPress,
  style,
}: BarbershopPhotoCarouselProps) {
  const { colors, isDark, radius } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(300);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  // Lista normalizada de fotos (respeitando limite de maxPhotos)
  const slidePhotos = useMemo<string[]>(() => {
    const list: string[] = [];
    const limit = maxPhotos ?? 3;
    if (photos && photos.length > 0) {
      for (const p of photos) {
        if (typeof p === 'string' && p.trim() && !list.includes(p.trim())) {
          list.push(p.trim());
          if (list.length === limit) break;
        }
      }
    }
    if (list.length === 0 && coverUrl && coverUrl.trim()) {
      list.push(coverUrl.trim());
    }
    return list;
  }, [photos, coverUrl, maxPhotos]);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    if (containerWidth > 0) {
      const index = Math.round(offsetX / containerWidth);
      if (index !== activeIndex && index >= 0 && index < slidePhotos.length) {
        setActiveIndex(index);
      }
    }
  };

  const handleImageError = (index: number) => {
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  };

  // Estado Vazio: nenhuma foto disponível
  if (slidePhotos.length === 0) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ambiente da barbearia ${barbershopName} (foto em breve)`}
        style={[
          styles.container,
          { height, backgroundColor: colors.surface.input },
          style,
        ]}
      >
        <View style={styles.placeholderCenter}>
          <BrandMark
            variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
            size={36}
            decorative
          />
          <View style={styles.placeholderBadge}>
            <Ionicons name="camera-outline" size={13} color={colors.text.secondary} />
            <Text variant="caption" color={colors.text.secondary} style={styles.placeholderText}>
              Ambiente The Obsidian Atelier
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // Foto única: exibe diretamente sem scroll
  if (slidePhotos.length === 1) {
    const photoUrl = slidePhotos[0];
    const isFailed = failedImages[0];

    return (
      <Pressable
        onPress={() => (onPhotoPress ? onPhotoPress(photoUrl, 0) : onPress?.())}
        accessibilityRole="button"
        accessibilityLabel={`Foto do ambiente da barbearia ${barbershopName}`}
        style={[
          styles.container,
          { height, backgroundColor: colors.surface.input },
          style,
        ]}
      >
        {!isFailed ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.fullImage}
            resizeMode="cover"
            onError={() => handleImageError(0)}
          />
        ) : (
          <View style={styles.placeholderCenter}>
            <BrandMark
              variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
              size={36}
              decorative
            />
            <Text variant="caption" color={colors.text.secondary} style={styles.placeholderText}>
              Foto demonstrativa de ambiente
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  // Múltiplas fotos (2 ou 3): Carrossel deslizável com indicadores
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        { height, backgroundColor: colors.surface.input },
        style,
      ]}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={32}
        style={styles.scrollView}
      >
        {slidePhotos.map((url, index) => {
          const isFailed = failedImages[index];

          return (
            <Pressable
              key={`${url}-${index}`}
              onPress={() => (onPhotoPress ? onPhotoPress(url, index) : onPress?.())}
              accessibilityRole="button"
              accessibilityLabel={`Foto ${index + 1} de ${slidePhotos.length} da barbearia ${barbershopName}`}
              style={{ width: containerWidth, height }}
            >
              {!isFailed ? (
                <Image
                  source={{ uri: url }}
                  style={styles.fullImage}
                  resizeMode="cover"
                  onError={() => handleImageError(index)}
                />
              ) : (
                <View style={styles.placeholderCenter}>
                  <BrandMark
                    variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                    size={36}
                    decorative
                  />
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    style={styles.placeholderText}
                  >
                    Ambiente demonstrativo ({index + 1}/{slidePhotos.length})
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Indicadores de Paginação / Dots */}
      <View
        pointerEvents="none"
        accessibilityLabel={`Foto ${activeIndex + 1} de ${slidePhotos.length}`}
        style={[
          styles.paginationOverlay,
          {
            borderRadius: radius.full,
          },
        ]}
      >
        {slidePhotos.map((_, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex
                    ? colors.brand.primary
                    : 'rgba(255, 255, 255, 0.45)',
                width: i === activeIndex ? 16 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  scrollView: {
    width: '100%',
    height: '100%',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  placeholderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paginationOverlay: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
