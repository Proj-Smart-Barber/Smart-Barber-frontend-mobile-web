import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export function EmptyState({ title, description, actionLabel, onAction, style }: { title: string; description: string; actionLabel?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const { spacing } = useTheme();
  return <View accessibilityRole="summary" style={[{ alignItems: 'center', gap: spacing[3] }, style]}><Text variant="h2" align="center">{title}</Text><Text variant="bodySm" align="center">{description}</Text>{actionLabel && onAction ? <Button variant="outline" title={actionLabel} onPress={onAction} /> : null}</View>;
}
