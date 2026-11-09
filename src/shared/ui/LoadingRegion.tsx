import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../theme';
import { Spinner } from './Spinner';
import { useLoadingFeedback, LoadingFeedbackInput } from './use-loading-feedback';

export type LoadingRegionProps = Partial<LoadingFeedbackInput> & {
  label?: string;
  accessibilityLabel?: string;
  hasContent?: boolean;
  busy?: boolean;
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
  longWaitMessage?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Estilo opcional transmitido exclusivamente ao contentWrapper interno quando hasContent=true.
   * Permite propagar restrições verticais (ex.: flex: 1, minHeight: 0) para elementos roláveis filhos,
   * preservando o dimensionamento automático dos demais consumidores sem opt-in.
   */
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * LoadingRegion
 * 
 * Contêiner contextual para carregamento assíncrono:
 * - Mantém conteúdo compatível e formulários durante atualização (refresh/next-page) sem piscar tela vazia.
 * - Quando não há conteúdo (hasContent=false) e ativo, renderiza placeholder decorativo (oculto para leitores de tela).
 * - Live region acessível única por região anunciando a operação ('label').
 * - Comunica espera longa (>8s) através de aviso contextual.
 * - Indicador transitório respeita janela de 200ms para evitar flicker em conexões rápidas.
 */
export function LoadingRegion({
  operationKey = 'default',
  active,
  busy,
  phase = 'initial',
  label,
  accessibilityLabel,
  hasContent = false,
  placeholder,
  children,
  longWaitMessage,
  style,
  contentStyle,
  testID,
}: LoadingRegionProps) {
  const { colors, spacing } = useTheme();
  const effectiveActive = active ?? busy ?? true;
  const effectiveLabel = label || accessibilityLabel || 'Carregando…';

  const { showIndicator, longWait } = useLoadingFeedback({
    operationKey,
    active: effectiveActive,
    phase,
  });

  const longWaitText = longWaitMessage || 'Esta operação está demorando mais que o esperado.';

  return (
    <View
      testID={testID}
      accessibilityRole="region"
      accessibilityLabel={effectiveLabel}
      aria-label={effectiveLabel}
      aria-busy={effectiveActive}
      accessibilityState={{ busy: effectiveActive }}
      style={[styles.container, style]}
    >
      {/* Live Region para leitores de tela (fora da subárvore de conteúdo para evitar adiar o anúncio) */}
      {effectiveActive && (
        <View
          accessibilityLiveRegion="polite"
          aria-live="polite"
          style={styles.srOnly}
        >
          <Text>{effectiveLabel}</Text>
          {longWait && <Text>{longWaitText}</Text>}
        </View>
      )}

      {!hasContent ? (
        effectiveActive ? (
          <View
            aria-hidden={true}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
            style={styles.placeholderWrapper}
          >
            {placeholder}
            {longWait && (
              <View
                style={[
                  styles.longWaitBanner,
                  { backgroundColor: colors.surface.elevated, marginTop: spacing[3] },
                ]}
              >
                <Text style={{ color: colors.text.secondary, fontSize: 13, textAlign: 'center' }}>
                  {longWaitText}
                </Text>
              </View>
            )}
          </View>
        ) : (
          (children as React.ReactElement) || null
        )
      ) : (
        <View
          testID={testID ? `${testID}-content-wrapper` : 'loading-region-content-wrapper'}
          style={[styles.contentWrapper, contentStyle]}
        >
          {children}
          {active && showIndicator && (
            <View
              testID="loading-region-indicator"
              style={[
                styles.transientIndicator,
                { backgroundColor: colors.background.primary + 'E6' },
              ]}
            >
              <Spinner size="small" color={colors.brand.primary} />
              <Text
                style={[
                  styles.transientText,
                  { color: colors.text.secondary, marginLeft: spacing[2] },
                ]}
              >
                {label}
              </Text>
            </View>
          )}
          {active && longWait && (
            <View
              style={[
                styles.longWaitBanner,
                { backgroundColor: colors.surface.elevated, marginTop: spacing[2] },
              ]}
            >
              <Text style={{ color: colors.text.secondary, fontSize: 13, textAlign: 'center' }}>
                {longWaitText}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    ...Platform.select({
      web: {
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
      } as any,
      default: {},
    }),
  },
  placeholderWrapper: {
    width: '100%',
  },
  contentWrapper: {
    width: '100%',
    position: 'relative',
  },
  transientIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    zIndex: 99,
  },
  transientText: {
    fontSize: 12,
  },
  longWaitBanner: {
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 16,
  },
});
