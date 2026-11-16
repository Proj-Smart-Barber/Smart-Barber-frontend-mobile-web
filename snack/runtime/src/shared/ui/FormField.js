import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';
export function FormField({ label, required = false, error, helperText, children, style }) {
    const { colors, spacing } = useTheme();
    return (<View style={[{ width: '100%', gap: spacing[1], marginBottom: spacing[4] }, style]}>
      <Text variant="bodySm" weight="semibold" color={colors.text.primary}>{label}{required ? ' (obrigatório)' : ''}</Text>
      {children}
      {error ? <Text variant="error" accessibilityRole="alert">{error}</Text> : helperText ? <Text variant="caption">{helperText}</Text> : null}
    </View>);
}
