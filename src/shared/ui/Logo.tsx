import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { BrandMark } from '../brand';
import { useTheme } from '../theme';

export interface LogoProps { size?: 'small' | 'medium' | 'large'; showSubtitle?: boolean; style?: StyleProp<ViewStyle>; }
/** @deprecated Use BrandMark with an explicit semantic variant. */
export function Logo({ size = 'medium', style }: LogoProps) {
  const { isDark } = useTheme();
  const dimensions = { small: 44, medium: 72, large: 112 } as const;
  return <View style={style}><BrandMark variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'} size={dimensions[size]} decorative={false} /></View>;
}
