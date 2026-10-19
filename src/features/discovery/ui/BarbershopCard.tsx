import React from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { PublicShop } from '../api/discovery.contract';

export interface BarbershopCardProps {
  shop: PublicShop;
  onPress?: () => void;
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

export function BarbershopCard({ shop, onPress }: BarbershopCardProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const router = useRouter();

  const formattedDistance = formatDistance(shop.distanceMeters);

  const handleNavigate = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/barbershops/${shop.id}`);
    }
  };

  return (
    <LiquidGlassView
      variant="card"
      borderRadius={radius.lg}
      style={styles.outerContainer}
      contentStyle={styles.cardContent}
    >
      <Pressable
        onPress={handleNavigate}
        accessibilityRole="button"
        accessibilityLabel={`Barbearia ${shop.name}`}
        style={styles.innerPressable}
      >
        <View style={styles.contentRow}>
          {/* Avatar / Imagem ou BrandMark Oficial */}
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
                resizeMode="cover"
              />
            ) : (
              <BrandMark
                variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                size={28}
                decorative
              />
            )}
          </View>

          {/* Dados da barbearia */}
          <View style={styles.infoCol}>
            <Text variant="body" weight="bold" numberOfLines={1} style={styles.nameText}>
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

            <View style={styles.metaBadgesRow}>
              {formattedDistance ? (
                <View
                  style={[
                    styles.distanceBadge,
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
                    style={[styles.distanceText, { color: colors.text.primary }]}
                  >
                    {formattedDistance}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.distanceBadge,
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
                    style={[styles.distanceText, { color: colors.text.secondary }]}
                  >
                    Catálogo online
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Desktop / Tablet: CTA alinhado à direita da mesma linha */}
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

        {/* Mobile: Rodapé equilibrado com indicador + CTA */}
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
                Agendamento imediato
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
      </Pressable>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 6,
  },
  cardContent: {
    padding: 16,
  },
  innerPressable: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    flex: 1,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  distanceText: {
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
    minHeight: 40,
  },
});

