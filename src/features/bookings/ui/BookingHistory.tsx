import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../shared/theme';
import { Text, Badge } from '../../../shared/ui';
import { LiquidGlassView } from '../../../shared/navigation/LiquidGlassView';
import type { BookingDto } from '../api/bookings.dto';

interface BookingHistoryProps {
  booking: BookingDto;
  currentUserId?: string | null;
}

export function BookingHistory({ booking, currentUserId }: BookingHistoryProps) {
  const { colors, spacing, radius, isDark } = useTheme();

  const createdDateStr = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const isCreatedByCurrentUser =
    Boolean(currentUserId && booking.createdByUserId && currentUserId === booking.createdByUserId);

  return (
    <LiquidGlassView
      variant="card"
      elevated
      borderRadius={radius.xl}
      contentStyle={[styles.card, { padding: spacing[5] }]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.headerIconBox,
              {
                backgroundColor: colors.surface.selected,
                borderColor: colors.border.ghost,
                borderRadius: radius.md,
              },
            ]}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="h3" weight="bold" style={{ color: colors.text.primary }}>
              Histórico e Auditoria
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              Rastreabilidade e registro oficial da reserva
            </Text>
          </View>
        </View>

        <Badge
          label={`Versão v${booking.version ?? 1}`}
          tone="neutral"
          size="sm"
        />
      </View>

      {createdDateStr ? (
        <View
          style={[
            styles.timelineCard,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
              borderColor: colors.border.subtle,
              borderRadius: radius.lg,
              padding: spacing[4],
            },
          ]}
        >
          <View style={styles.eventRow}>
            <View style={styles.timelineTrack}>
              <View
                style={[
                  styles.dotOuter,
                  {
                    backgroundColor: colors.surface.selected,
                    borderColor: colors.brand.primary,
                  },
                ]}
              >
                <View style={[styles.dotInner, { backgroundColor: colors.brand.primary }]} />
              </View>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.eventHeaderRow}>
                <Text variant="bodySm" weight="bold" style={{ color: colors.text.primary }}>
                  Agendamento Registrado
                </Text>
                {isCreatedByCurrentUser ? (
                  <Badge label="Você" tone="brand" size="sm" />
                ) : null}
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.text.secondary} />
                <Text variant="caption" style={{ color: colors.text.secondary }}>
                  Criado em: {createdDateStr}
                </Text>
              </View>

              {booking.createdByUserId ? (
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={13} color={colors.text.muted} />
                  <Text
                    variant="caption"
                    style={{ color: colors.text.muted, flex: 1 }}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    ID do autor: {booking.createdByUserId}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {/* Alerta de contrato: Não inventar sequência de atores */}
      <View
        style={[
          styles.noticeBox,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.025)' : 'rgba(0, 0, 0, 0.02)',
            borderColor: colors.border.subtle,
            borderRadius: radius.md,
          },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={colors.text.muted}
          style={{ marginTop: 1 }}
        />
        <Text variant="caption" style={{ color: colors.text.secondary, flex: 1, lineHeight: 18 }}>
          Contrato de auditoria detalhada: O backend ainda não fornece a trilha de eventos cronológicos completa para esta reserva. Apenas dados de criação autorizados são exibidos.
        </Text>
      </View>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCard: {
    borderWidth: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineTrack: {
    alignItems: 'center',
    paddingTop: 2,
  },
  dotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
});
