import React from 'react';
import { View } from 'react-native';
import { BrandMark } from '../brand';
import { useTheme } from '../theme';
/** @deprecated Use BrandMark with an explicit semantic variant. */
export function Logo({ size = 'medium', style }) {
    const { isDark } = useTheme();
    const dimensions = { small: 44, medium: 72, large: 112 };
    return <View style={style}><BrandMark variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'} size={dimensions[size]} decorative={false}/></View>;
}
