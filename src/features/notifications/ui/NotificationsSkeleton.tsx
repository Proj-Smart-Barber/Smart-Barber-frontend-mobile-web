import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Skeleton } from '@/shared/ui/Skeleton';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';

export interface NotificationsSkeletonProps {
  count?: number;
}

/**
 * NotificationsSkeleton
 * 
 * Esqueleto decorativo para a lista de notificações do cliente.
 * Reserva a geometria dos itens de notificação sem anúncios individuais por elemento.
 */
export function NotificationsSkeleton({ count = 4 }: NotificationsSkeletonProps) {
  const { spacing, radius } = useTheme();
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View
      testID="notifications-skeleton"
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      {items.map((key) => (
        <LiquidGlassView
          key={key}
          variant="card"
          borderRadius={radius.md}
          style={{ marginBottom: spacing[3] }}
          contentStyle={styles.card}
        >
          <View style={styles.row}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={styles.contentCol}>
              <View style={styles.headerRow}>
                <Skeleton width="55%" height={16} borderRadius={radius.sm} />
                <Skeleton width={50} height={12} borderRadius={radius.sm} />
              </View>
              <Skeleton width="90%" height={14} borderRadius={radius.sm} style={{ marginTop: 8 }} />
              <Skeleton width="70%" height={14} borderRadius={radius.sm} style={{ marginTop: 4 }} />
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
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contentCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
