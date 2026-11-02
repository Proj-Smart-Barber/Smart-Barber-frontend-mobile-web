import React from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { BrandMark } from '@/shared/brand';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import {
  buildBarbershopCatalogHref,
  type PublicShop,
} from '../api/discovery.contract';
import { formatDistance } from './BarbershopCard';

export interface BarbershopHomeCarouselProps {
  items: PublicShop[];
  onSelectShop?: (shop: PublicShop) => void;
}

const CARD_WIDTH = 280;
const CARD_GAP = 14;

export function BarbershopHomeCarousel({
  items,
  onSelectShop,
}: BarbershopHomeCarouselProps) {
  const { colors, radius, isDark } = useTheme();
  const router = useRouter();

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + CARD_GAP}
      decelerationRate="fast"
      contentContainerStyle={styles.scrollContent}
      style={styles.carouselContainer}
    >
      {items.map((shop, index) => {
        const formattedDistance = formatDistance(shop.distanceMeters);
        const coverImage = shop.coverUrl || shop.photos?.[0] || null;

        const handlePress = () => {
          if (onSelectShop) {
            onSelectShop(shop);
          } else {
            router.push(buildBarbershopCatalogHref(shop.id) as any);
          }
        };

        const ratingLabel =
          shop.reviewCount && shop.reviewCount > 0 && shop.rating != null
            ? `Avaliação ${shop.rating.toFixed(1)} com ${shop.reviewCount} ${
                shop.reviewCount === 1 ? 'avaliação' : 'avaliações'
              }`
            : 'Sem avaliações';

        const distanceLabel = formattedDistance ? `, a ${formattedDistance}` : '';

        return (
          <View
            key={shop.id}
            style={[
              styles.cardWrapper,
              {
                width: CARD_WIDTH,
                marginRight: index === items.length - 1 ? 0 : CARD_GAP,
              },
            ]}
          >
            <LiquidGlassView
              variant="card"
              borderRadius={radius.lg}
              style={styles.glassCard}
              contentStyle={styles.cardContent}
            >
              <Pressable
                onPress={handlePress}
                accessibilityRole="button"
                accessibilityLabel={`Barbearia ${shop.name}, ${ratingLabel}${distanceLabel}. Toque para ver serviços.`}
                style={styles.cardPressable}
              >
                {/* 1. Capa do ambiente da unidade */}
                <View
                  style={[
                    styles.coverContainer,
                    {
                      backgroundColor: colors.surface.input,
                      borderTopLeftRadius: radius.lg - 2,
                      borderTopRightRadius: radius.lg - 2,
                    },
                  ]}
                >
                  {coverImage ? (
                    <Image
                      source={{ uri: coverImage }}
                      style={styles.coverImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderCover}>
                      <BrandMark
                        variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                        size={32}
                        decorative
                      />
                      <Text
                        variant="caption"
                        color={colors.text.secondary}
                        style={styles.placeholderCaption}
                      >
                        Ambiente The Obsidian Atelier
                      </Text>
                    </View>
                  )}

                  {/* Distância no canto superior direito da capa quando disponível */}
                  {formattedDistance && (
                    <View
                      style={[
                        styles.distancePill,
                        {
                          borderRadius: radius.full,
                          backgroundColor: 'rgba(11, 11, 11, 0.75)',
                          borderColor: colors.border.subtle,
                        },
                      ]}
                    >
                      <Ionicons
                        name="navigate"
                        size={11}
                        color={colors.brand.primary}
                      />
                      <Text
                        variant="caption"
                        style={[styles.distancePillText, { color: '#FFFFFF' }]}
                      >
                        {formattedDistance}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 2. Conteúdo textual e Logo separada */}
                <View style={styles.bodyContainer}>
                  <View style={styles.headerInfoRow}>
                    {/* Logo/Avatar compacto */}
                    <View
                      style={[
                        styles.avatarBadge,
                        {
                          borderRadius: radius.md,
                          backgroundColor: colors.surface.input,
                          borderColor: colors.border.subtle,
                        },
                      ]}
                    >
                      {shop.avatarUrl ? (
                        <Image
                          source={{ uri: shop.avatarUrl }}
                          style={styles.avatarImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <BrandMark
                          variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                          size={22}
                          decorative
                        />
                      )}
                    </View>

                    {/* Nome da barbearia */}
                    <View style={styles.titleCol}>
                      <Text
                        variant="body"
                        weight="bold"
                        numberOfLines={2}
                        style={styles.shopName}
                      >
                        {shop.name}
                      </Text>
                    </View>
                  </View>

                  {/* Endereço resumido */}
                  <View style={styles.locationRow}>
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color={colors.text.secondary}
                      style={styles.locationIcon}
                    />
                    <Text
                      variant="caption"
                      color={colors.text.secondary}
                      numberOfLines={1}
                      style={styles.locationText}
                    >
                      {shop.location}
                    </Text>
                  </View>

                  {/* Rodapé do Card: Avaliação e Ação rápida */}
                  <View style={styles.footerRow}>
                    {shop.reviewCount && shop.reviewCount > 0 && shop.rating != null ? (
                      <View
                        style={[
                          styles.ratingBadge,
                          {
                            borderRadius: radius.sm,
                            backgroundColor: 'rgba(217, 119, 6, 0.15)',
                            borderColor: 'rgba(217, 119, 6, 0.3)',
                          },
                        ]}
                      >
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text
                          variant="caption"
                          style={[styles.ratingText, { color: '#fbbf24', fontWeight: '700' }]}
                        >
                          {shop.rating.toFixed(1)} ({shop.reviewCount})
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.ratingBadge,
                          {
                            borderRadius: radius.sm,
                            backgroundColor: colors.surface.input,
                            borderColor: colors.border.subtle,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          color={colors.text.secondary}
                          style={styles.ratingText}
                        >
                          Sem avaliações
                        </Text>
                      </View>
                    )}

                    <View style={styles.ctaRow}>
                      <Text
                        variant="caption"
                        weight="bold"
                        color={colors.brand.primary}
                        style={styles.ctaText}
                      >
                        Ver serviços
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color={colors.brand.primary}
                      />
                    </View>
                  </View>
                </View>
              </Pressable>
            </LiquidGlassView>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginVertical: 4,
  },
  scrollContent: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  cardWrapper: {
    flexShrink: 0,
  },
  glassCard: {
    width: '100%',
  },
  cardContent: {
    padding: 0,
  },
  cardPressable: {
    width: '100%',
  },
  coverContainer: {
    width: '100%',
    height: 130,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  placeholderCaption: {
    fontSize: 11,
    fontWeight: '500',
  },
  distancePill: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  distancePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodyContainer: {
    padding: 14,
    gap: 8,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 15,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    flexShrink: 0,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  ratingText: {
    fontSize: 11,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ctaText: {
    fontSize: 12,
  },
});
