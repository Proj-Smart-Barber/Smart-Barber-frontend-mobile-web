import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme, useReducedMotion } from '../theme';

export function Skeleton({ width = '100%', height = 16, style }: { width?: ViewStyle['width']; height?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, radius } = useTheme(); const reducedMotion = useReducedMotion();
  return <View accessibilityLabel="Carregando conteúdo" style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.surface.elevated, opacity: reducedMotion ? 0.8 : 1 }, style]} />;
}
