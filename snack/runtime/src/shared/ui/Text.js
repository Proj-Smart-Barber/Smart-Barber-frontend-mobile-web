import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '../theme';
export function Text({ variant = 'body', color, weight, align, style, children, ...rest }) {
    const { colors, typography } = useTheme();
    const resolvedVariant = variant === 'error' ? 'caption' : variant;
    const base = typography.styles[resolvedVariant];
    const defaultColor = variant === 'error' ? colors.feedback.error : variant === 'button' ? colors.text.inverse : colors.text.body;
    return <RNText style={[base, { color: color !== null && color !== void 0 ? color : defaultColor, textAlign: align }, weight ? { fontWeight: typography.fontWeights[weight] } : undefined, style]} {...rest}>{children}</RNText>;
}
