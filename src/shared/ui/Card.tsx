import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';

export function Card({ children, elevated = false, style }: { children: React.ReactNode; elevated?: boolean; style?: StyleProp<ViewStyle> }) {
  const { components, radius, spacing } = useTheme();
  return <View style={[{ backgroundColor: elevated ? components.card.elevated : components.card.background, borderRadius: radius.lg, borderCurve: 'continuous', padding: spacing[6], borderWidth: 1, borderColor: components.card.border }, style]}>{children}</View>;
}
