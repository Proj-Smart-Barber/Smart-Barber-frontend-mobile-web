import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useReducedMotion, useReducedTransparency, useTheme } from '@/shared/theme';

export type LiquidGlassVariant = 'navigation' | 'sidebar' | 'card' | 'form';

export interface LiquidGlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: LiquidGlassVariant;
  autoHeight?: boolean;
  borderRadius?: number;
  intensity?: number;
  elevated?: boolean;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
}

export function LiquidGlassView({
  children,
  style,
  contentStyle,
  variant = 'navigation',
  autoHeight,
  borderRadius,
  intensity,
  elevated = true,
  borderWidth = 1,
  borderColor,
  backgroundColor,
}: LiquidGlassViewProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const reducedTransparency = useReducedTransparency();

  // Define defaults com base na variante
  const isCard = variant === 'card';
  const isSidebar = variant === 'sidebar';
  const isNavigation = variant === 'navigation';
  const isForm = variant === 'form';

  // Altura automática é padrão em cartões e formulários, enquanto navbar e sidebar operam em dimensões estruturadas
  const resolvedAutoHeight = autoHeight !== undefined ? autoHeight : (isCard || isForm);

  const flattenedStyle = (StyleSheet.flatten(style) || {}) as ViewStyle;

  // Extrai propriedades visuais decorativas para que não vazem como borda ou fundo retangular no wrapper de sombra
  const {
    backgroundColor: styleBg,
    borderColor: styleBorderColor,
    borderWidth: styleBorderWidth,
    borderTopWidth: _btw,
    borderBottomWidth: _bbw,
    borderLeftWidth: _blw,
    borderRightWidth: _brw,
    borderRadius: styleRadius,
    borderTopLeftRadius: _btlr,
    borderTopRightRadius: _btrr,
    borderBottomLeftRadius: _bblr,
    borderBottomRightRadius: _bbrr,
    ...outerStyle
  } = flattenedStyle;

  const explicitHeight = outerStyle.height;
  const explicitMinHeight = outerStyle.minHeight;

  const resolvedRadius =
    borderRadius !== undefined
      ? borderRadius
      : typeof styleRadius === 'number'
        ? styleRadius
        : isForm
          ? 26
          : isCard
            ? 26
            : isSidebar
              ? 30
              : 32;

  const resolvedIntensity =
    intensity !== undefined
      ? intensity
      : isForm
        ? 50
        : isCard
          ? 45
          : isSidebar
            ? 55
            : 55;

  // Paleta de cores translúcidas de alto contraste baseada nas referências do design system
  // Variante 'form' possui maior densidade/opacidade para garantir legibilidade dos campos (WCAG 4.5:1)
  const glassBackground = backgroundColor
    ? backgroundColor
    : typeof styleBg === 'string' && styleBg !== 'transparent'
      ? styleBg
      : isForm
        ? isDark
          ? 'rgba(24, 25, 29, 0.82)'
          : 'rgba(255, 255, 255, 0.88)'
        : isCard
          ? isDark
            ? 'rgba(32, 33, 38, 0.64)'
            : 'rgba(255, 255, 255, 0.80)'
          : isSidebar
            ? isDark
              ? 'rgba(26, 28, 33, 0.52)'
              : 'rgba(255, 255, 255, 0.62)'
            : isDark
              ? 'rgba(20, 20, 20, 0.72)'
              : 'rgba(255, 255, 255, 0.78)';

  const glassBorderColor = borderColor
    ? borderColor
    : typeof styleBorderColor === 'string'
      ? styleBorderColor
      : isForm
        ? isDark
          ? 'rgba(255, 255, 255, 0.14)'
          : 'rgba(0, 0, 0, 0.08)'
        : isCard
          ? isDark
            ? 'rgba(255, 255, 255, 0.145)'
            : 'rgba(0, 0, 0, 0.08)'
          : isSidebar
            ? isDark
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(255, 255, 255, 0.9)'
            : isDark
              ? 'rgba(255, 255, 255, 0.14)'
              : 'rgba(0, 0, 0, 0.08)';

  const resolvedBorderWidth =
    borderWidth !== undefined
      ? borderWidth
      : typeof styleBorderWidth === 'number'
        ? styleBorderWidth
        : 1;

  // Fallbacks elegantes em caso de preferência de transparência reduzida ou ausência de suporte
  const solidFallbackBackground = isDark
    ? isForm
      ? '#16171a'
      : isSidebar
        ? '#16171a'
        : isCard
          ? '#1c1d21'
          : '#141414'
    : isForm
      ? '#ffffff'
      : isSidebar
        ? '#f5f3f0'
        : colors.surface.elevated;

  const solidFallbackBorder = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : 'rgba(0, 0, 0, 0.1)';

  // No Web, aplicamos backdropFilter via CSS Style específico por variante
  const webBlurAmount = isForm
    ? 'blur(20px) saturate(130%)'
    : isCard
      ? 'blur(18px) saturate(115%)'
      : isSidebar
        ? 'blur(22px) saturate(120%)'
        : 'blur(20px) saturate(180%)';

  const webBackdropStyle: any =
    Platform.OS === 'web'
      ? reducedTransparency
        ? {
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }
        : {
            backdropFilter: webBlurAmount,
            WebkitBackdropFilter: webBlurAmount,
          }
      : {};

  const activeBackground = reducedTransparency ? solidFallbackBackground : glassBackground;
  const activeBorderColor = reducedTransparency ? solidFallbackBorder : glassBorderColor;

  // Configuração de profundidade e sombra refinada por variante
  const shadowConfig = !elevated
    ? {}
    : isSidebar
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.35 : 0.10,
          shadowRadius: 28,
          elevation: 8,
        }
      : isForm
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.35 : 0.09,
            shadowRadius: 24,
            elevation: 6,
          }
        : isCard
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: isDark ? 0.25 : 0.07,
              shadowRadius: 16,
              elevation: 4,
            }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.45 : 0.16,
              shadowRadius: 20,
              elevation: 12,
            };

  return (
    <View
      style={[
        styles.shadowWrapper,
        {
          borderRadius: resolvedRadius,
        },
        shadowConfig,
        outerStyle,
      ]}
    >
      <View
        style={[
          resolvedAutoHeight ? styles.autoHeightInner : styles.fixedHeightInner,
          isNavigation && styles.centerInner,
          {
            borderRadius: resolvedRadius,
            borderColor: activeBorderColor,
            borderWidth: resolvedBorderWidth,
            backgroundColor: activeBackground,
            ...(explicitHeight !== undefined ? { height: explicitHeight } : {}),
            ...(explicitMinHeight !== undefined ? { minHeight: explicitMinHeight } : {}),
          },
          webBackdropStyle,
        ]}
      >
        {Platform.OS !== 'web' && !reducedTransparency ? (
          <BlurView
            intensity={resolvedIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Camada sutil de reflexo / acabamento especular */}
        {!reducedTransparency ? (
          <View
            pointerEvents="none"
            style={[
              styles.specularHighlight,
              {
                borderTopColor: isDark
                  ? isForm
                    ? 'rgba(255, 255, 255, 0.13)'
                    : isCard
                      ? 'rgba(255, 255, 255, 0.11)'
                      : 'rgba(255, 255, 255, 0.15)'
                  : isForm
                    ? 'rgba(255, 255, 255, 0.90)'
                    : isCard
                      ? 'rgba(255, 255, 255, 0.85)'
                      : 'rgba(255, 255, 255, 0.75)',
                borderRadius: resolvedRadius,
              },
              Platform.OS === 'web'
                ? ({
                    backgroundImage: isDark
                      ? isForm
                        ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.09), transparent 40%)'
                        : 'linear-gradient(145deg, rgba(255, 255, 255, 0.08), transparent 42%)'
                      : isForm
                        ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.50), transparent 40%)'
                        : 'linear-gradient(145deg, rgba(255, 255, 255, 0.45), transparent 42%)',
                  } as any)
                : null,
            ]}
          />
        ) : null}

        <View
          style={[
            resolvedAutoHeight ? styles.autoHeightContent : styles.fixedHeightContent,
            isNavigation && styles.centerContent,
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  fixedHeightInner: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  autoHeightInner: {
    width: '100%',
    height: 'auto',
    overflow: 'hidden',
    position: 'relative',
  },
  centerInner: {
    justifyContent: 'center',
  },
  specularHighlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  fixedHeightContent: {
    width: '100%',
    height: '100%',
  },
  autoHeightContent: {
    width: '100%',
    height: 'auto',
  },
  centerContent: {
    justifyContent: 'center',
  },
});
