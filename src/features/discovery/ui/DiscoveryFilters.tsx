import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { DiscoveryMode, DiscoveryRadius } from '../model/discovery.types';

export interface DiscoveryFiltersProps {
  mode: DiscoveryMode;
  onModeChange: (mode: DiscoveryMode) => void;
  radiusKm: DiscoveryRadius;
  onRadiusChange: (radius: DiscoveryRadius) => void;
  isLocationAvailable: boolean;
  onRequestLocation: () => void;
}

const RADIUS_OPTIONS: DiscoveryRadius[] = [5, 10, 25, 50];

export function DiscoveryFilters({
  mode,
  onModeChange,
  radiusKm,
  onRadiusChange,
  isLocationAvailable,
  onRequestLocation,
}: DiscoveryFiltersProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={styles.container}>
      {/* Seletor de Modo (Todas / Perto de mim) */}
      <LiquidGlassView style={[styles.modeToggle, { borderRadius: radius.full }]}>
        <Pressable
          onPress={() => onModeChange('ALL')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'ALL' }}
          style={[
            styles.modeButton,
            mode === 'ALL' && {
              backgroundColor: colors.brand.primary,
              borderRadius: radius.full,
            },
          ]}
        >
          <Text
            variant="caption"
            style={[
              styles.modeText,
              { color: mode === 'ALL' ? '#FFFFFF' : colors.text.secondary },
            ]}
          >
            Todas
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!isLocationAvailable) {
              onRequestLocation();
            }
            onModeChange('NEARBY');
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'NEARBY' }}
          style={[
            styles.modeButton,
            mode === 'NEARBY' && {
              backgroundColor: colors.brand.primary,
              borderRadius: radius.full,
            },
          ]}
        >
          <Ionicons
            name="navigate"
            size={13}
            color={mode === 'NEARBY' ? '#FFFFFF' : colors.text.secondary}
            style={styles.modeIcon}
          />
          <Text
            variant="caption"
            style={[
              styles.modeText,
              { color: mode === 'NEARBY' ? '#FFFFFF' : colors.text.secondary },
            ]}
          >
            Perto de mim
          </Text>
        </Pressable>
      </LiquidGlassView>

      {/* Seletor Compacto de Raio (ativo somente em NEARBY) */}
      {mode === 'NEARBY' && (
        <View style={styles.radiusRow}>
          <Text variant="caption" color={colors.text.secondary} style={styles.radiusLabel}>
            Raio:
          </Text>
          <View style={styles.radiusButtonsGroup}>
            {RADIUS_OPTIONS.map((opt) => {
              const isSelected = radiusKm === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => onRadiusChange(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Raio de ${opt} quilômetros`}
                  style={[
                    styles.radiusPill,
                    {
                      borderColor: isSelected ? colors.brand.primary : colors.border.subtle,
                      backgroundColor: isSelected
                        ? colors.surface.selected
                        : colors.surface.default,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={[
                      styles.radiusPillText,
                      {
                        color: isSelected ? colors.brand.primary : colors.text.secondary,
                        fontWeight: isSelected ? '700' : '400',
                      },
                    ]}
                  >
                    {opt} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    gap: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    padding: 3,
    alignSelf: 'flex-start',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  modeIcon: {
    marginRight: 6,
  },
  modeText: {
    fontWeight: '600',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radiusLabel: {
    fontWeight: '500',
  },
  radiusButtonsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  radiusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  radiusPillText: {
    fontSize: 12,
  },
});
