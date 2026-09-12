import React from 'react';
import { Pressable, View } from 'react-native';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Card, EmptyState, Skeleton, Text } from '@/shared/ui';
import type { AgendaBooking, AgendaBookingDetails, AgendaViewMode } from '../api/agenda.contract';
import { AgendaBookingCard } from './AgendaBookingCard';
import { AgendaSimpleBookingRow } from './AgendaSimpleBookingRow';

interface AgendaTimelineProps {
  mode: AgendaViewMode;
  onModeChange: (mode: AgendaViewMode) => void;
  details: AgendaBookingDetails[];
  simpleBookings: AgendaBooking[];
  isToday: boolean;
  isLoading: boolean;
  isUpdatingDate: boolean;
  onGoToToday: () => void;
  onCancelBooking?: (bookingId: string) => void;
  cancellingBookingId?: string | null;
  cancelErrorBookingId?: string | null;
  cancelErrorMessage?: string | null;
}

const MODE_OPTIONS: { label: string; value: AgendaViewMode }[] = [
  { label: 'Detalhada', value: 'details' },
  { label: 'Simples', value: 'simple' },
];

/** Lista de agendamentos do dia (detalhada ou simples). */
export function AgendaTimeline({
  mode,
  onModeChange,
  details,
  simpleBookings,
  isToday,
  isLoading,
  isUpdatingDate,
  onGoToToday,
  onCancelBooking,
  cancellingBookingId = null,
  cancelErrorBookingId = null,
  cancelErrorMessage = null,
}: AgendaTimelineProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  const totalCount = mode === 'simple' ? simpleBookings.length : details.length;
  const hasEntries = totalCount > 0;

  return (
    <View style={{ width: '100%', gap: spacing[4] }}>
      <View
        style={{
          flexDirection: isCompact ? 'column' : 'row',
          alignItems: isCompact ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: spacing[3],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
          <Text variant="h2" color={colors.text.primary}>
            Agendamentos
          </Text>
          <Text variant="caption" color={colors.text.muted}>
            {totalCount} {totalCount === 1 ? 'horário' : 'horários'}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface.input,
            borderRadius: radius.full,
            padding: 4,
            gap: 4,
            alignSelf: isCompact ? 'flex-start' : 'auto',
          }}
        >
          {MODE_OPTIONS.map((option) => {
            const isActive = mode === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={`Ver agenda ${option.label.toLowerCase()}`}
                accessibilityState={{ selected: isActive }}
                onPress={() => onModeChange(option.value)}
                style={{
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: radius.full,
                  backgroundColor: isActive ? colors.brand.primary : 'transparent',
                }}
              >
                <Text
                  variant="tab"
                  color={isActive ? colors.text.inverse : colors.text.secondary}
                  weight={isActive ? 'semibold' : 'medium'}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={{ gap: spacing[3] }}>
          {[0, 1, 2].map((index) => (
            <Card key={index} style={{ minHeight: 84, gap: spacing[2] }}>
              <Skeleton width={140} height={18} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="40%" height={14} />
            </Card>
          ))}
        </View>
      ) : !hasEntries ? (
        <Card style={{ padding: spacing[6] }}>
          <EmptyState
            title="Nenhum agendamento neste dia"
            description="Não há horários reservados para a data selecionada."
            actionLabel={isToday ? undefined : 'Voltar para hoje'}
            onAction={isToday ? undefined : onGoToToday}
          />
        </Card>
      ) : (
        <View
          style={[{ gap: spacing[3] }, isUpdatingDate ? { opacity: 0.6 } : null]}
        >
          {mode === 'simple'
            ? simpleBookings.map((booking) => (
                <AgendaSimpleBookingRow
                  key={booking.id}
                  booking={booking}
                  onCancel={onCancelBooking ? () => onCancelBooking(booking.id) : undefined}
                  isCancelling={cancellingBookingId === booking.id}
                  cancelError={cancelErrorBookingId === booking.id ? cancelErrorMessage : null}
                />
              ))
            : details.map((booking) => (
                <AgendaBookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={onCancelBooking ? () => onCancelBooking(booking.id) : undefined}
                  isCancelling={cancellingBookingId === booking.id}
                  cancelError={cancelErrorBookingId === booking.id ? cancelErrorMessage : null}
                />
              ))}
        </View>
      )}
    </View>
  );
}
