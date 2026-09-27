import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

export function Badge({ label, tone = 'brand', style }: { label: string; tone?: 'brand' | 'success' | 'successAlt' | 'warning' | 'error' | 'info'; style?: StyleProp<ViewStyle> }) {
  const { colors, radius, spacing } = useTheme();
  const palette = tone === 'successAlt' ? { fg: colors.feedback.successAlt, bg: colors.feedback.successAltBackground, border: colors.feedback.successAltBorder } : tone === 'info' ? { fg: colors.feedback.info, bg: colors.feedback.infoBackground, border: colors.feedback.infoBorder } : tone === 'success' ? { fg: colors.feedback.success, bg: colors.feedback.successBackground, border: colors.feedback.successBorder } : tone === 'warning' ? { fg: colors.feedback.warning, bg: colors.feedback.warningBackground, border: colors.feedback.warningBorder } : tone === 'error' ? { fg: colors.feedback.error, bg: colors.feedback.errorBackground, border: colors.feedback.errorBorder } : { fg: colors.brand.primary, bg: colors.surface.selected, border: colors.border.selected };
  return <View style={[{ alignSelf: 'flex-start', paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full, backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 }, style]}><Text variant="badge" color={palette.fg}>{label}</Text></View>;
}
