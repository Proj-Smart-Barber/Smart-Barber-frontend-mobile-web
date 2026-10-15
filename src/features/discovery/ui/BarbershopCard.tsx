import React from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
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
  const { colors, spacing, radius } = useTheme();
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
    <LiquidGlassView style={[styles.container, { borderRadius: radius.lg }]}>
      <Pressable
        onPress={handleNavigate}
        accessibilityRole="button"
        accessibilityLabel={`Barbearia ${shop.name}`}
        style={styles.innerPressable}
      >
        <View style={styles.contentRow}>
          {/* Avatar / Imagem ou Placeholder */}
          <View
            style={[
              styles.avatarContainer,
              {
                borderRadius: radius.md,
                backgroundColor: colors.surface.input,
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
              <Ionicons
                name="cut-outline"
                size={28}
                color={colors.text.secondary}
              />
            )}
          </View>

          {/* Dados da barbearia */}
          <View style={styles.infoCol}>
            <Text variant="body" weight="medium" numberOfLines={1} style={styles.nameText}>
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

            {formattedDistance && (
              <View
                style={[
                  styles.distanceBadge,
                  {
                    backgroundColor: colors.surface.default,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.sm,
                  },
                ]}
              >
                <Ionicons
                  name="navigate-outline"
                  size={12}
                  color={colors.brand.primary}
                />
                <Text
                  variant="caption"
                  style={[styles.distanceText, { color: colors.text.primary }]}
                >
                  {formattedDistance}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Botão de ação único e claro */}
        <View style={[styles.actionRow, { marginTop: spacing[3] }]}>
          <Button
            title="Ver serviços"
            variant="primary"
            onPress={handleNavigate}
            style={styles.actionButton}
          />
        </View>
      </Pressable>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  innerPressable: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 14,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontWeight: '700',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    flex: 1,
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    minWidth: 120,
  },
});
