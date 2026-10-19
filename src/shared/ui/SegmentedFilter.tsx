import React from 'react';
import { View, Pressable, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme, useReducedMotion } from '../theme';
import { Text } from './Text';

export interface SegmentedFilterOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface SegmentedFilterProps<T extends string = string> {
  options: SegmentedFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente C3: Filtro Segmentado
 * Inspirado em Rubber Segment (React Bits), universal para React Native / Web.
 * Toque mínimo de 44px, acessibilidade de abas, transição discreta e adaptação para 320px.
 */
export function SegmentedFilter<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  style,
}: SegmentedFilterProps<T>) {
  const { colors, spacing, radius } = useTheme();
  const reducedMotion = useReducedMotion();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.background.secondary,
          padding: 3,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border.default,
          alignItems: 'stretch',
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        const displayLabel =
          option.count !== undefined
            ? `${option.label} (${option.count})`
            : option.label;

        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            onPress={() => {
              if (!disabled) onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled }}
            accessibilityLabel={displayLabel}
            style={({ pressed }) => [
              {
                flex: 1,
                minHeight: 44, // Garantia estrita de alvo de toque >= 44px (P02 / C3)
                paddingHorizontal: spacing[2],
                paddingVertical: spacing[2],
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                borderCurve: 'continuous',
                backgroundColor: isSelected
                  ? colors.background.primary
                  : pressed && !disabled
                    ? colors.surface.selected
                    : 'transparent',
                borderWidth: isSelected ? 1 : 0,
                borderColor: isSelected ? colors.border.default : 'transparent',
                ...(Platform.OS === 'web'
                  ? ({
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      userSelect: 'none',
                      transition: reducedMotion ? 'none' : 'background-color 150ms ease',
                    } as any)
                  : {}),
              },
            ]}
          >
            <Text
              variant="caption"
              weight={isSelected ? 'bold' : 'medium'}
              color={isSelected ? colors.brand.primary : colors.text.secondary}
              align="center"
              numberOfLines={1}
            >
              {displayLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
