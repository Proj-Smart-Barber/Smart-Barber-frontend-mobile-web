import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Skeleton } from '@/shared/ui/Skeleton';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';

export interface NearbyResultsSkeletonProps {
  count?: number;
}

/**
 * NearbyResultsSkeleton
 * 
 * Esqueleto para listagem de resultados de proximidade e busca textual.
 * Agrupa placeholders em LiquidGlassView sem anúncios individuais.
 */
export function NearbyResultsSkeleton({ count = 3 }: NearbyResultsSkeletonProps) {
  const { spacing, radius } = useTheme();
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View
      testID="nearby-results-skeleton"
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      {items.map((key) => (
        <LiquidGlassView
          key={key}
          variant="card"
          borderRadius={radius.lg}
          style={{ marginBottom: spacing[3] }}
          contentStyle={styles.card}
        >
          <View style={styles.row}>
            <Skeleton width={72} height={72} borderRadius={radius.md} />
            <View style={styles.infoCol}>
              <Skeleton width="65%" height={18} borderRadius={radius.sm} style={{ marginBottom: 6 }} />
              <Skeleton width="85%" height={14} borderRadius={radius.sm} style={{ marginBottom: 8 }} />
              <View style={styles.metaRow}>
                <Skeleton width={50} height={14} borderRadius={radius.sm} />
                <Skeleton width={60} height={14} borderRadius={radius.sm} />
              </View>
            </View>
          </View>
        </LiquidGlassView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  card: {
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
