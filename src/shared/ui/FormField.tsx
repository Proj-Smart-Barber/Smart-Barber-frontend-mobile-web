import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

export interface FormFieldProps { label: string; required?: boolean; error?: string; helperText?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; }
export function FormField({ label, required = false, error, helperText, children, style }: FormFieldProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[{ width: '100%', gap: spacing[1], marginBottom: spacing[4] }, style]}>
      <Text variant="bodySm" weight="semibold" color={colors.text.primary}>{label}{required ? ' (obrigatório)' : ''}</Text>
      {children}
      {error ? <Text variant="error" accessibilityRole="alert">{error}</Text> : helperText ? <Text variant="caption">{helperText}</Text> : null}
    </View>
  );
}
