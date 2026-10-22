import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/shared/theme';
import { Text, Skeleton, EmptyState } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { AvailabilitySlotDto } from '../api/bookings.dto';
import type { SelectedSlot } from '../model/booking-flow.types';
import {formatSlotTime} from '../lib/slot-time';

export interface BookingSlotPickerProps {
  timezone?: string;
  serverNow?: number | null;
  selectedDate: string | null;
  selectedSlot: SelectedSlot | null;
  availabilitySlots: AvailabilitySlotDto[];
  isLoading?: boolean;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: SelectedSlot) => void;
}

function formatDayOfWeek(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getUTCDay()];
  } catch {
    return '';
  }
}

function formatDayNumber(dateStr: string): string {
  try {
    const [, , d] = dateStr.split('-');
    return d || '';
  } catch {
    return '';
  }
}

export function BookingSlotPicker({
  timezone,
  serverNow,
  selectedDate,
  selectedSlot,
  availabilitySlots,
  isLoading = false,
  onSelectDate,
  onSelectSlot,
}: BookingSlotPickerProps) {
  const { colors, spacing, radius } = useTheme();

  // Gera os próximos 14 dias para escolha rápida de data
  const upcomingDates = useMemo(() => {
    const dates: string[] = [];
    if (!timezone || serverNow == null) return dates;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(serverNow));
    const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
    const now = new Date(Date.UTC(part('year'), part('month') - 1, part('day'), 12));
    for (let i = 0; i < 14; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  }, [timezone, serverNow]);

  if (!timezone) {
    return <EmptyState title="Horários indisponíveis" description="Não foi possível identificar o fuso da barbearia. Atualize a página e tente novamente." />;
  }

  return (
    <View style={{ gap: spacing[4] }}>
      {/* Carrossel de Datas Civis */}
      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" weight="medium" color={colors.text.secondary}>
          Selecione a data:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2], paddingVertical: 4 }}
        >
          {upcomingDates.length === 0 && <Text variant="caption" color={colors.text.muted}>Sincronizando a data da barbearia…</Text>}
          {upcomingDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr;
            return (
              <Pressable
                key={dateStr}
                onPress={() => onSelectDate(dateStr)}
                accessibilityRole="button"
                accessibilityLabel={`Data ${dateStr}`}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <LiquidGlassView
                  variant="card"
                  elevated={isSelected}
                  borderRadius={radius.md}
                  borderColor={isSelected ? colors.brand.primary : colors.border.default}
                  borderWidth={isSelected ? 2 : 1}
                  contentStyle={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    minWidth: 54,
                    minHeight: 58,
                  }}
                >
                  <Text
                    variant="caption"
                    weight="medium"
                    color={isSelected ? colors.brand.primary : colors.text.muted}
                  >
                    {formatDayOfWeek(dateStr)}
                  </Text>
                  <Text
                    variant="body"
                    weight="bold"
                    color={isSelected ? colors.brand.primary : colors.text.primary}
                  >
                    {formatDayNumber(dateStr)}
                  </Text>
                </LiquidGlassView>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Grid de Horários Disponíveis */}
      <View style={{ gap: spacing[2] }}>
        <Text variant="caption" weight="medium" color={colors.text.secondary}>
          Horários disponíveis para o profissional e serviços escolhidos:
        </Text>

        {isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width={76} height={44} borderRadius={radius.md} />
            ))}
          </View>
        ) : availabilitySlots.length === 0 ? (
          <EmptyState
            title="Nenhum horário livre"
            description="Não encontramos horários disponíveis nesta data para o profissional selecionado. Tente outra data."
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {availabilitySlots.map((slot) => {
              const timeFormatted = formatSlotTime(slot.start, timezone);
              const isSelected = selectedSlot?.slotStartAt === slot.start;

              return (
                <Pressable
                  key={slot.start}
                  onPress={() =>
                    onSelectSlot({
                      start: slot.start,
                      end: slot.end,
                      startTime: timeFormatted,
                      slotStartAt: slot.start,
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Horário ${timeFormatted}`}
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <LiquidGlassView
                    variant="card"
                    elevated={isSelected}
                    borderRadius={radius.md}
                    borderColor={isSelected ? colors.brand.primary : colors.border.default}
                    borderWidth={isSelected ? 2 : 1}
                    contentStyle={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      minWidth: 76,
                      minHeight: 44,
                    }}
                  >
                    <Text
                      variant="bodySm"
                      weight="bold"
                      color={isSelected ? colors.brand.primary : colors.text.primary}
                    >
                      {timeFormatted}
                    </Text>
                  </LiquidGlassView>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
