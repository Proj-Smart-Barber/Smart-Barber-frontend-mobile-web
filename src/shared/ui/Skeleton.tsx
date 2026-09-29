import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useTheme, useReducedMotion } from '../theme';

export interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente C4: Skeleton e Revelação
 * Inspirado em Skeleton Reveal (Spectrum UI), universal para React Native / Web.
 * Reserva geometria real de layout sem causar layout shifts;
 * Pulso de opacidade suave que se desativa automaticamente com reduced motion.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius,
  style,
}: SkeletonProps) {
  const { colors, radius } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacityAnim = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacityAnim.setValue(0.7);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [reducedMotion, opacityAnim]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando conteúdo"
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? radius.sm,
          backgroundColor: colors.surface.elevated,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}
