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
  const { colors, radius } = useTheme();

  return (
    <View style={styles.container}>
      {/* Seletor de Modo Horizontal (Todas / Perto de mim) */}
      <LiquidGlassView
        variant="card"
        borderRadius={radius.lg}
        style={styles.modeToggleOuter}
        contentStyle={styles.modeToggleContent}
      >
        <Pressable
          onPress={() => onModeChange('ALL')}
          accessibilityRole="tab"
          accessibilityState={{ selected: mode === 'ALL' }}
          style={[
            styles.modeButton,
            { borderRadius: radius.md },
            mode === 'ALL' && {
              backgroundColor: colors.brand.primary,
            },
          ]}
        >
          <Ionicons
            name={mode === 'ALL' ? 'grid' : 'grid-outline'}
            size={14}
            color={mode === 'ALL' ? '#FFFFFF' : colors.text.secondary}
            style={styles.modeIcon}
          />
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
            { borderRadius: radius.md },
            mode === 'NEARBY' && {
              backgroundColor: colors.brand.primary,
            },
          ]}
        >
          <Ionicons
            name="navigate"
            size={14}
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
            Raio de busca:
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
                        ? colors.brand.primary
                        : colors.surface.input,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={[
                      styles.radiusPillText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text.secondary,
                        fontWeight: isSelected ? '700' : '500',
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
    marginVertical: 4,
    gap: 12,
  },
  modeToggleOuter: {
    alignSelf: 'flex-start',
  },
  modeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeIcon: {
    marginRight: 6,
  },
  modeText: {
    fontWeight: '700',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusLabel: {
    fontWeight: '600',
  },
  radiusButtonsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  radiusPill: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusPillText: {
    fontSize: 12,
  },
});

