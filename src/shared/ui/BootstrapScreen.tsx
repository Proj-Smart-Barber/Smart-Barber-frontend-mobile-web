import React from 'react';
import { View } from 'react-native';
import { BrandMark } from '../brand';
import { useTheme } from '../theme';
import { Spinner } from './Spinner';
import { Text } from './Text';

export function BootstrapScreen({ message = 'Preparando sua experiência…' }: { message?: string }) {
  const { colors, spacing, isDark } = useTheme();
  return <View accessibilityRole="progressbar" accessibilityLabel={message} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[6], padding: spacing[6], backgroundColor: colors.background.primary }}><BrandMark variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'} size={112} decorative={false} /><Spinner size="large" /><Text variant="bodySm" align="center">{message}</Text></View>;
}
