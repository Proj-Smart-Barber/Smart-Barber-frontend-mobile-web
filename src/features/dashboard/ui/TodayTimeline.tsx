import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Card, EmptyState, Skeleton, Text } from '@/shared/ui';
import type { DashboardAppointment } from '../api/dashboard.contract';
import { formatCurrency, mapStatusBadgeTone, mapStatusLabel } from '../model/dashboard.helpers';

interface TodayTimelineProps {
  appointments: DashboardAppointment[];
  isLoading?: boolean;
}

export function TodayTimeline({
  appointments,
  isLoading = false,
}: TodayTimelineProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const router = useRouter();

  const handleOpenAgenda = () => {
    router.push('/(app)/agenda' as any);
  };

  return (
    <View style={{ width: '100%', gap: spacing[3] }}>
      {/* Cabeçalho da Seção com Link Rápido */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: 2 }}>
          <Text variant="subhead" weight="bold" color={colors.text.primary}>
            Próximos da Fila
          </Text>
          <Text variant="caption" color={colors.text.muted}>
            Prévia dos próximos horários agendados
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver agenda completa"
          hitSlop={8}
          onPress={handleOpenAgenda}
          style={({ pressed }) => [
            styles.linkButton,
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text variant="caption" weight="bold" color={colors.brand.primary}>
            Ver completa
          </Text>
          <Ionicons name="arrow-forward" size={14} color={colors.brand.primary} />
        </Pressable>
      </View>

      {/* Lista de Prévia (até 3 itens) */}
      {isLoading ? (
        <View style={{ gap: spacing[2] }}>
          <Card style={{ minHeight: 64, gap: spacing[2], padding: spacing[3] }}>
            <Skeleton width={120} height={16} />
            <Skeleton width="50%" height={12} />
          </Card>
          <Card style={{ minHeight: 64, gap: spacing[2], padding: spacing[3] }}>
            <Skeleton width={120} height={16} />
            <Skeleton width="50%" height={12} />
          </Card>
        </View>
      ) : appointments.length === 0 ? (
        <Card style={{ padding: spacing[4], alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            title="Nenhum outro atendimento na fila"
            description="Não há outros horários agendados além do destaque imediato."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing[2] }}>
          {appointments.map((item) => {
            const isCompleted = item.status === 'COMPLETED';

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Atendimento de ${item.customerName} às ${item.scheduledTime}. Toque para abrir na agenda.`}
                onPress={handleOpenAgenda}
                style={({ pressed }) => [
                  styles.previewItemCard,
                  {
                    backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                    padding: spacing[3],
                    opacity: isCompleted ? 0.6 : 1,
                  },
                ]}
              >
                {/* Horário */}
                <View
                  style={[
                    styles.timeBadge,
                    {
                      backgroundColor: colors.surface.input,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Text variant="bodySm" color={colors.text.primary} weight="bold">
                    {item.scheduledTime}
                  </Text>
                </View>

                {/* Cliente e Serviço */}
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <Text
                    variant="bodySm"
                    weight="bold"
                    color={colors.text.primary}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.customerName}
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.serviceTitle} · {formatCurrency(item.servicePriceInCents)}
                  </Text>
                </View>

                {/* Status Badge e Chevron */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <Badge
                    label={mapStatusLabel(item.status)}
                    tone={mapStatusBadgeTone(item.status)}
                    style={{ transform: [{ scale: 0.85 }] }}
                  />
                  <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Link de Rodapé para Agenda */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir agenda completa"
        onPress={handleOpenAgenda}
        style={({ pressed }) => [
          styles.footerLink,
          {
            backgroundColor: pressed ? colors.surface.selected : 'transparent',
            borderColor: colors.border.subtle,
            borderRadius: radius.md,
            paddingVertical: spacing[3],
          },
        ]}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
        <Text variant="bodySm" color={colors.text.secondary} weight="medium">
          Abrir agenda completa
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  previewItemCard: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeBadge: {
    width: 52,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLink: {
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    minHeight: 44,
  },
});
