import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useReducedMotion, useTheme } from '@/shared/theme';

export interface LiquidGlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  borderRadius?: number;
  intensity?: number;
  elevated?: boolean;
}

export function LiquidGlassView({
  children,
  style,
  contentStyle,
  borderRadius = 32,
  intensity = 55,
  elevated = true,
}: LiquidGlassViewProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();

  // Cores translúcidas com alto contraste e saturação refinada
  const glassBackground = isDark
    ? 'rgba(20, 20, 20, 0.72)'
    : 'rgba(255, 255, 255, 0.78)';

  const glassBorderColor = isDark
    ? 'rgba(255, 255, 255, 0.14)'
    : 'rgba(0, 0, 0, 0.08)';

  // Fallback opaco caso o ambiente não suporte blur ou para alto contraste
  const solidFallbackBackground = isDark ? '#141414' : colors.surface.elevated;

  // No Web, aplicamos backdropFilter via CSS Style
  const webBackdropStyle: any =
    Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }
      : {};

  const flattenedStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;
  const explicitHeight = flattenedStyle.height;
  const explicitMinHeight = flattenedStyle.minHeight;

  return (
    <View
      style={[
        styles.shadowWrapper,
        elevated && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.45 : 0.16,
          shadowRadius: 20,
          elevation: 12,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.innerContainer,
          {
            borderRadius,
            borderColor: glassBorderColor,
            backgroundColor: glassBackground,
            ...(explicitHeight !== undefined ? { height: explicitHeight } : {}),
            ...(explicitMinHeight !== undefined ? { minHeight: explicitMinHeight } : {}),
          },
          webBackdropStyle,
        ]}
      >
        {Platform.OS !== 'web' ? (
          <BlurView
            intensity={intensity}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Camada sutil de reflexo / acabamento especular */}
        <View
          pointerEvents="none"
          style={[
            styles.specularHighlight,
            {
              borderTopColor: isDark
                ? 'rgba(255, 255, 255, 0.18)'
                : 'rgba(255, 255, 255, 0.65)',
              borderRadius,
            },
          ]}
        />

        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    backgroundColor: 'transparent',
  },
  innerContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  specularHighlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
});
