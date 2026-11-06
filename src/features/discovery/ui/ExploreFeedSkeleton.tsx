import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import { Skeleton } from '@/shared/ui/Skeleton';

export interface ExploreFeedSkeletonProps {
  width?: number;
  height?: number;
  topInset?: number;
  bottomInset?: number;
}

/**
 * ExploreFeedSkeleton
 * 
 * Esqueleto de palco para carga inicial do feed do Explorar.
 * Reserva a geometria exata do slide em tela cheia:
 * - Topo compacto com chip de localização e botão de filtros.
 * - Trilho lateral direito de ações circulares.
 * - Bloco inferior com título da barbearia, nota, distância e botão de agendamento.
 */
export function ExploreFeedSkeleton({
  width: propWidth,
  height: propHeight,
  topInset: propTopInset,
  bottomInset: propBottomInset,
}: ExploreFeedSkeletonProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useAppSafeArea();
  const { radius } = useTheme();

  const width = propWidth || windowWidth;
  const height = propHeight || windowHeight;
  const topInset = propTopInset !== undefined ? propTopInset : (insets.top > 0 ? insets.top + 8 : 16);
  const bottomInset = propBottomInset !== undefined ? propBottomInset : (insets.bottom > 0 ? insets.bottom + 80 : 96);

  return (
    <View
      testID="explore-feed-skeleton"
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, { width, height }]}
    >
      {/* 1. Palco Principal de Fundo */}
      <Skeleton width="100%" height={height} borderRadius={0} style={StyleSheet.absoluteFill} />

      {/* 2. Topo: Título + Localização + Filtros */}
      <View style={[styles.topBar, { paddingTop: Math.max(topInset, 16) + 4 }]}>
        <View style={styles.topBarLeft}>
          <Skeleton width={110} height={26} borderRadius={radius.sm} style={{ marginBottom: 6 }} />
          <Skeleton width={160} height={16} borderRadius={radius.sm} />
        </View>
        <Skeleton width={52} height={42} borderRadius={21} />
      </View>

      {/* 3. Trilho de Ações à Direita */}
      <View style={[styles.actionRail, { bottom: bottomInset + 16 }]}>
        <Skeleton width={48} height={48} borderRadius={24} style={{ marginBottom: 12 }} />
        <Skeleton width={48} height={48} borderRadius={24} style={{ marginBottom: 12 }} />
        <Skeleton width={48} height={48} borderRadius={24} />
      </View>

      {/* 4. Bloco Inferior de Informações e CTA */}
      <View style={[styles.bottomInfo, { bottom: bottomInset }]}>
        <Skeleton width="70%" height={24} borderRadius={radius.sm} style={{ marginBottom: 8 }} />
        <View style={styles.metaRow}>
          <Skeleton width={80} height={16} borderRadius={radius.sm} />
          <Skeleton width={70} height={16} borderRadius={radius.sm} />
        </View>
        <Skeleton width="100%" height={48} borderRadius={radius.md} style={{ marginTop: 14 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0a',
    position: 'relative',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topBarLeft: {
    flex: 1,
  },
  actionRail: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomInfo: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
