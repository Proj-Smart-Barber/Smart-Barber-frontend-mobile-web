import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

export type BadgeTone =
  | 'brand'
  | 'success'
  | 'successAlt'
  | 'warning'
  | 'error'
  | 'info'
  | 'pending'
  | 'neutral';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente C6: Badge de Estado
 * Inspirado em Status Badge (Spectrum UI).
 * Combina texto explícito, cor contextual de alto contraste e ícone opcional.
 */
export function Badge({
  label,
  tone = 'brand',
  size = 'md',
  icon,
  style,
}: BadgeProps) {
  const { colors, radius, spacing } = useTheme();
  const isSmall = size === 'sm';

  const palette = {
    brand: {
      fg: colors.text.crimson,
      bg: colors.surface.selected,
      border: colors.border.selected,
    },
    success: {
      fg: colors.feedback.successForeground,
      bg: colors.feedback.successBackground,
      border: colors.feedback.successBorder,
    },
    successAlt: {
      fg: colors.feedback.successAltForeground,
      bg: colors.feedback.successAltBackground,
      border: colors.feedback.successAltBorder,
    },
    warning: {
      fg: colors.feedback.warningForeground,
      bg: colors.feedback.warningBackground,
      border: colors.feedback.warningBorder,
    },
    error: {
      fg: colors.feedback.errorForeground,
      bg: colors.feedback.errorBackground,
      border: colors.feedback.errorBorder,
    },
    info: {
      fg: colors.feedback.infoForeground,
      bg: colors.feedback.infoBackground,
      border: colors.feedback.infoBorder,
    },
    pending: {
      fg: colors.text.brand,
      bg: colors.surface.selected,
      border: colors.border.ghost,
    },
    neutral: {
      fg: colors.text.secondary,
      bg: colors.surface.elevated,
      border: colors.border.default,
    },
  }[tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
      style={[
        {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: isSmall ? 4 : 5,
          paddingHorizontal: isSmall ? spacing[2] : spacing[3],
          paddingVertical: isSmall ? 2 : spacing[1],
          borderRadius: radius.full,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1,
        },
        style,
      ]}
    >
      {icon}
      <Text
        variant="badge"
        color={palette.fg}
        style={isSmall ? { fontSize: 10, lineHeight: 13 } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
