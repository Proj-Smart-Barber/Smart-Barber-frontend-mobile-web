import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme';

export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'subhead' | 'price' | 'body' | 'bodySm' | 'caption' | 'badge' | 'tab' | 'button' | 'error';
export interface TextProps extends RNTextProps { variant?: TextVariant; color?: string; weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extraBold'; align?: 'left' | 'center' | 'right'; children: React.ReactNode; }

export function Text({ variant = 'body', color, weight, align, style, children, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  const resolvedVariant = variant === 'error' ? 'caption' : variant;
  const base = typography.styles[resolvedVariant] as TextStyle;
  const defaultColor = variant === 'error' ? colors.feedback.error : variant === 'button' ? colors.text.inverse : colors.text.body;
  return <RNText style={[base, { color: color ?? defaultColor, textAlign: align }, weight ? { fontWeight: typography.fontWeights[weight] } : undefined, style]} {...rest}>{children}</RNText>;
}
