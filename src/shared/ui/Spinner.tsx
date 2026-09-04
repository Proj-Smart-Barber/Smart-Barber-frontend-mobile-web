import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export interface SpinnerProps extends Omit<ActivityIndicatorProps, 'color'> {
  color?: string;
  size?: 'small' | 'large' | number;
}

export function Spinner({ color, size = 'small', style, ...rest }: SpinnerProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator
        size={size}
        color={color || colors.brand.primary}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
