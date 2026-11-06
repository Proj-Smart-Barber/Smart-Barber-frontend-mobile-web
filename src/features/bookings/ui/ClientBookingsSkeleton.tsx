import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Skeleton } from '@/shared/ui/Skeleton';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';

export interface ClientBookingsSkeletonProps {
  count?: number;
}

/**
 * ClientBookingsSkeleton
 * 
 * Esqueleto decorativo para a tela Meus Agendamentos do cliente.
 * Reserva a geometria do próximo agendamento de destaque e dos cards regulares da lista.
 */
export function ClientBookingsSkeleton({ count = 3 }: ClientBookingsSkeletonProps) {
  const { spacing, radius } = useTheme();
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View
      testID="client-bookings-skeleton"
      aria-hidden={true}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
      style={styles.container}
    >
      {/* 1. Destaque: Próximo Agendamento */}
      <LiquidGlassView
        variant="card"
        borderRadius={radius.lg}
        style={{ marginBottom: spacing[4] }}
        contentStyle={styles.featuredCard}
      >
        <View style={styles.headerRow}>
          <Skeleton width={130} height={18} borderRadius={radius.sm} />
          <Skeleton width={80} height={22} borderRadius={radius.sm} />
        </View>
        <Skeleton width="75%" height={22} borderRadius={radius.sm} style={{ marginTop: 12, marginBottom: 8 }} />
        <Skeleton width="50%" height={16} borderRadius={radius.sm} style={{ marginBottom: 16 }} />
        <View style={styles.footerRow}>
          <Skeleton width={110} height={36} borderRadius={radius.md} />
          <Skeleton width={110} height={36} borderRadius={radius.md} />
        </View>
      </LiquidGlassView>

      {/* 2. Cards Regulares da Lista */}
      {items.map((key) => (
        <LiquidGlassView
          key={key}
          variant="card"
          borderRadius={radius.md}
          style={{ marginBottom: spacing[3] }}
          contentStyle={styles.regularCard}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={16} borderRadius={radius.sm} style={{ marginBottom: 6 }} />
              <Skeleton width="40%" height={14} borderRadius={radius.sm} />
            </View>
            <Skeleton width={70} height={20} borderRadius={radius.sm} />
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
  featuredCard: {
    padding: 16,
  },
  regularCard: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
