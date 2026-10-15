import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { NextBookingItem } from '../api/discovery.contract';

export interface ClientNextBookingCardProps {
  booking: NextBookingItem | null;
  serverTime: string | null;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  onFindBarbershop?: () => void;
}

export function formatBookingDateTime(startsAt: string | Date): {
  dateStr: string;
  timeStr: string;
} {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) {
    return { dateStr: 'Data a confirmar', timeStr: '--:--' };
  }

  const dateStr = d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  const timeStr = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return { dateStr, timeStr };
}

export function calculateRemainingMinutes(
  startsAt: string | Date,
  serverTimeStr: string | null,
): { minutes: number; isOngoing: boolean } {
  const startMs = new Date(startsAt).getTime();
  const currentMs = serverTimeStr ? new Date(serverTimeStr).getTime() : Date.now();

  const diffMs = startMs - currentMs;
  const minutes = Math.round(diffMs / (60 * 1000));

  return {
    minutes,
    isOngoing: minutes <= 0 && minutes >= -60,
  };
}

export function ClientNextBookingCard({
  booking,
  serverTime,
  isLoading,
  isError,
  onRetry,
  onFindBarbershop,
}: ClientNextBookingCardProps) {
  const { colors, spacing, radius } = useTheme();
  const router = useRouter();

  const remaining = useMemo(() => {
    if (!booking) return null;
    return calculateRemainingMinutes(booking.startsAt, serverTime);
  }, [booking, serverTime]);

  // Estado de Carregamento
  if (isLoading) {
    return (
      <LiquidGlassView style={[styles.container, { borderRadius: radius.lg }]}>
        <Skeleton width="40%" height={16} style={{ marginBottom: 12 }} />
        <Skeleton width="70%" height={22} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={40} style={{ borderRadius: radius.md }} />
      </LiquidGlassView>
    );
  }

  // Estado de Erro da Consulta
  if (isError) {
    return (
      <LiquidGlassView style={[styles.container, { borderRadius: radius.lg }]}>
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={colors.feedback.warning}
            style={styles.errorIcon}
          />
          <View style={styles.errorCol}>
            <Text variant="caption" weight="medium" color={colors.text.primary}>
              Não foi possível carregar seu próximo agendamento
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              Verifique sua conexão e tente novamente.
            </Text>
          </View>
        </View>
        {onRetry && (
          <Button
            title="Recarregar"
            variant="ghost"
            onPress={onRetry}
            style={styles.retryButton}
          />
        )}
      </LiquidGlassView>
    );
  }

  // Estado Sem Agendamentos Elegíveis
  if (!booking) {
    return (
      <LiquidGlassView style={[styles.container, { borderRadius: radius.lg }]}>
        <View style={styles.emptyContent}>
          <View
            style={[
              styles.emptyIconBadge,
              {
                backgroundColor: colors.surface.default,
                borderColor: colors.border.subtle,
                borderRadius: radius.full,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={24} color={colors.brand.primary} />
          </View>
          <View style={styles.emptyTextCol}>
            <Text variant="body" weight="bold" style={styles.emptyTitle}>
              Seu próximo cuidado começa aqui
            </Text>
            <Text variant="caption" color={colors.text.secondary}>
              Encontre os melhores barbeiros perto de você e reserve em segundos.
            </Text>
          </View>
        </View>
        <Button
          title="Encontrar barbearia"
          variant="primary"
          onPress={onFindBarbershop || (() => router.push('/(client)/explore'))}
          style={styles.ctaButton}
        />
      </LiquidGlassView>
    );
  }

  // Estado com Agendamento Confirmado/Em Andamento
  const { dateStr, timeStr } = formatBookingDateTime(booking.startsAt);
  const serviceSummary = booking.services?.map((s) => s.title).join(', ') || 'Atendimento';

  return (
    <LiquidGlassView
      style={[
        styles.container,
        {
          borderRadius: radius.lg,
          borderColor: colors.brand.primary,
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.tagBadge}>
          <Text variant="caption" style={[styles.tagText, { color: colors.brand.primary }]}>
            {remaining?.isOngoing ? 'EM ATENDIMENTO' : 'PRÓXIMO AGENDAMENTO'}
          </Text>
        </View>

        {remaining && !remaining.isOngoing && remaining.minutes > 0 && remaining.minutes <= 180 && (
          <Text variant="caption" color={colors.text.secondary} style={styles.countdownText}>
            em {remaining.minutes} min
          </Text>
        )}
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.datetimeBadge}>
          <Text variant="h3" weight="bold" style={[styles.timeText, { color: colors.text.primary }]}>
            {timeStr}
          </Text>
          <Text variant="caption" color={colors.text.secondary} style={styles.dateText}>
            {dateStr}
          </Text>
        </View>

        <View style={styles.infoCol}>
          <Text variant="body" weight="medium" numberOfLines={1} style={styles.shopName}>
            {booking.barbershopName || 'Barbearia'}
          </Text>
          <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
            {serviceSummary}
          </Text>
          {booking.barbermanName && (
            <Text variant="caption" color={colors.text.secondary} numberOfLines={1}>
              com {booking.barbermanName}
            </Text>
          )}
        </View>
      </View>

      <Button
        title="Ver agendamento"
        variant="primary"
        onPress={() => router.push('/(client)/bookings')}
        style={styles.ctaButton}
      />
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(218, 41, 28, 0.12)',
    borderRadius: 6,
  },
  tagText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  countdownText: {
    fontWeight: '600',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  datetimeBadge: {
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  timeText: {
    fontWeight: '800',
    fontSize: 20,
  },
  dateText: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  infoCol: {
    flex: 1,
    paddingLeft: 14,
  },
  shopName: {
    fontWeight: '700',
    marginBottom: 2,
  },
  ctaButton: {
    width: '100%',
  },
  emptyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconBadge: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  emptyTextCol: {
    flex: 1,
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorIcon: {
    marginRight: 10,
  },
  errorCol: {
    flex: 1,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
});
