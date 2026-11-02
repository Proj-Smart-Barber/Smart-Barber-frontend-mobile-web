import React from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import {
  buildBarbershopCatalogHref,
  type PublicShop,
} from '../api/discovery.contract';
import { BarbershopPhotoCarousel } from './BarbershopPhotoCarousel';

export interface BarbershopCardProps {
  shop: PublicShop;
  onPress?: () => void;
  showPhotoCarousel?: boolean;
}

export function formatDistance(distanceMeters: number | null): string | null {
  if (distanceMeters === null || distanceMeters === undefined || Number.isNaN(distanceMeters)) {
    return null;
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m de você`;
  }
  const km = (distanceMeters / 1000).toFixed(1).replace('.', ',');
  return `${km} km de você`;
}

export function BarbershopCard({
  shop,
  onPress,
  showPhotoCarousel = true,
}: BarbershopCardProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const router = useRouter();

  const formattedDistance = formatDistance(shop.distanceMeters);

  const handleNavigate = () => {
    if (onPress) {
      onPress();
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
    <LiquidGlassView
      variant="card"
      borderRadius={radius.lg}
      style={styles.outerContainer}
      contentStyle={styles.cardContent}
    >
      {/* 1. Carrossel de fotos (até 3 fotos) ou Capa única */}
      {showPhotoCarousel && (
        <BarbershopPhotoCarousel
          photos={shop.photos}
          coverUrl={shop.coverUrl}
          barbershopName={shop.name}
          height={175}
          onPress={handleNavigate}
          style={{
            borderTopLeftRadius: radius.lg - 2,
            borderTopRightRadius: radius.lg - 2,
          }}
        />
      )}

      {/* 2. Conteúdo da Barbearia */}
      <View style={styles.innerContainer}>
        <View style={styles.contentRow}>
          <Pressable
            onPress={handleNavigate}
            accessibilityRole="button"
            accessibilityLabel={`Barbearia ${shop.name}, ${ratingLabel}${distanceLabel}. Toque para ver detalhes.`}
            style={styles.clickableInfo}
          >
            {/* Logo / Avatar separado da capa */}
            <View
              style={[
                styles.avatarContainer,
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
                  style={styles.avatar}
                  resizeMode="contain"
                />
              ) : (
                <BrandMark
                  variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                  size={26}
                  decorative
                />
              )}
            </View>

            {/* Dados descritivos */}
            <View style={styles.infoCol}>
              <Text
                variant="body"
                weight="bold"
                numberOfLines={2}
                style={styles.nameText}
              >
                {shop.name}
              </Text>

              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.text.secondary}
                  style={styles.locationIcon}
                />
                <Text
                  variant="caption"
                  color={colors.text.secondary}
                  numberOfLines={2}
                  style={styles.locationText}
                >
                  {shop.location}
                </Text>
              </View>

              {/* Badges de Reputação e Distância */}
              <View style={styles.metaBadgesRow}>
                {/* Avaliação com nota e contagem */}
                {shop.reviewCount && shop.reviewCount > 0 && shop.rating != null ? (
                  <View
                    style={[
                      styles.badgeItem,
                      {
                        backgroundColor: 'rgba(217, 119, 6, 0.15)',
                        borderColor: 'rgba(217, 119, 6, 0.3)',
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text
                      variant="caption"
                      style={[styles.badgeText, { color: '#fbbf24', fontWeight: '700' }]}
                    >
                      {shop.rating.toFixed(1)} ({shop.reviewCount})
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.badgeItem,
                      {
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={[styles.badgeText, { color: colors.text.secondary }]}
                    >
                      Sem avaliações
                    </Text>
                  </View>
                )}

                {/* Distância autoritativa em km */}
                {formattedDistance ? (
                  <View
                    style={[
                      styles.badgeItem,
                      {
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.sm,
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
                      style={[styles.badgeText, { color: colors.text.primary }]}
                    >
                      {formattedDistance}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.badgeItem,
                      {
                        backgroundColor: colors.surface.input,
                        borderColor: colors.border.subtle,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color={colors.brand.primary}
                    />
                    <Text
                      variant="caption"
                      style={[styles.badgeText, { color: colors.text.secondary }]}
                    >
                      Catálogo online
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>

          {/* Desktop / Tablet CTA à direita */}
          {!isCompact && (
            <View style={styles.desktopActionCol}>
              <Button
                title="Ver serviços"
                variant="primary"
                rightIcon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
                onPress={handleNavigate}
                style={styles.actionButton}
              />
            </View>
          )}
        </View>

        {/* Mobile: Rodapé equilibrado com CTA claro */}
        {isCompact && (
          <View
            style={[
              styles.mobileFooterRow,
              {
                marginTop: spacing[3],
                paddingTop: spacing[3],
                borderTopColor: colors.border.subtle,
              },
            ]}
          >
            <View style={styles.mobileTrustHint}>
              <Ionicons name="time-outline" size={13} color={colors.text.muted} />
              <Text variant="caption" color={colors.text.muted}>
                Agendamento online
              </Text>
            </View>
            <Button
              title="Ver serviços"
              variant="primary"
              rightIcon={<Ionicons name="arrow-forward" size={15} color="#FFFFFF" />}
              onPress={handleNavigate}
              style={styles.actionButton}
            />
          </View>
        )}
      </View>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 8,
    width: '100%',
  },
  cardContent: {
    padding: 0,
    overflow: 'hidden',
  },
  innerContainer: {
    width: '100%',
    padding: 16,
  },
  clickableInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 14,
    flexShrink: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationIcon: {
    flexShrink: 0,
  },
  locationText: {
    flex: 1,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  desktopActionCol: {
    marginLeft: 16,
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  mobileTrustHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    minWidth: 132,
    minHeight: 44,
  },
});
