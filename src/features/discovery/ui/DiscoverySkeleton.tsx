import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Skeleton } from '@/shared/ui/Skeleton';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';

export interface DiscoverySkeletonProps {
  count?: number;
}

export function DiscoverySkeleton({ count = 3 }: DiscoverySkeletonProps = {}) {
  const { spacing, radius } = useTheme();
  const keys = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={styles.container}>
      {keys.map((key) => (
        <LiquidGlassView
          key={key}
          variant="card"
          borderRadius={radius.lg}
          style={{ marginBottom: spacing[3] }}
          contentStyle={styles.card}
        >
          <View style={styles.row}>
            <Skeleton width={64} height={64} style={{ borderRadius: radius.md }} />
            <View style={styles.contentCol}>
              <Skeleton width="75%" height={18} style={{ marginBottom: 8 }} />
              <Skeleton width="90%" height={14} style={{ marginBottom: 8 }} />
              <Skeleton width="40%" height={14} />
            </View>
          </View>
        </LiquidGlassView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  card: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
  },
  contentCol: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
});
