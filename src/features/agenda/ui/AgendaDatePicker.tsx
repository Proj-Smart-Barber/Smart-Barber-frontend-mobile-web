import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui';
import {
  addMonths,
  formatMonthLabel,
  formatDateLabel,
  getCalendarWeekdaysShort,
  getCalendarWeeks,
} from '../model/agenda.helpers';

interface AgendaDatePickerProps {
  visible: boolean;
  selectedDate: string;
  todayIso: string;
  minDateIso: string;
  maxDateIso: string;
  onSelectDate: (iso: string) => void;
  onClose: () => void;
}

function MonthNavButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? colors.border.focus : colors.border.default,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.text.primary} />
    </Pressable>
  );
}

function DayCell({
  iso,
  isSelected,
  isToday,
  isDisabled,
  onPress,
}: {
  iso: string;
  isSelected: boolean;
  isToday: boolean;
  isDisabled: boolean;
  onPress: (iso: string) => void;
}) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatDateLabel(iso)}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => onPress(iso)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: isSelected
          ? colors.brand.primary
          : pressed
            ? colors.surface.selected
            : 'transparent',
        borderWidth: focused ? 2 : isToday && !isSelected ? 1.5 : 0,
        borderColor: focused ? colors.border.focus : colors.border.selected,
        opacity: isDisabled ? 0.35 : 1,
      })}
    >
      <Text
        variant="bodySm"
        color={isSelected ? colors.text.inverse : colors.text.primary}
        numberOfLines={1}
      >
        {Number(iso.slice(8))}
      </Text>
    </Pressable>
  );
}

/**
 * Calendário mensal para seleção direta do dia da agenda.
 * Dias fora do limite de navegação ficam desabilitados.
 */
export function AgendaDatePicker({
  visible,
  selectedDate,
  todayIso,
  minDateIso,
  maxDateIso,
  onSelectDate,
  onClose,
}: AgendaDatePickerProps) {
  const { colors, spacing, radius } = useTheme();
  const reducedMotion = useReducedMotion();
  const [displayedMonth, setDisplayedMonth] = useState(selectedDate);

  useEffect(() => {
    if (visible) setDisplayedMonth(selectedDate);
  }, [visible, selectedDate]);

  const weeks = getCalendarWeeks(displayedMonth);
  const weekdayLabels = getCalendarWeekdaysShort();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        accessibilityLabel="Fechar calendário"
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: colors.background.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing[4],
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.background.card,
            borderRadius: radius.lg,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.border.subtle,
            paddingVertical: spacing[4],
            paddingHorizontal: spacing[2],
            gap: spacing[2],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[2],
              paddingHorizontal: spacing[2],
            }}
          >
            <MonthNavButton
              icon="chevron-back"
              label="Mês anterior"
              onPress={() => setDisplayedMonth((current) => addMonths(current, -1))}
            />
            <Text variant="h3" color={colors.text.primary} accessibilityRole="header">
              {formatMonthLabel(displayedMonth)}
            </Text>
            <MonthNavButton
              icon="chevron-forward"
              label="Próximo mês"
              onPress={() => setDisplayedMonth((current) => addMonths(current, 1))}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: spacing[1],
            }}
          >
            {weekdayLabels.map((label) => (
              <View
                key={label}
                style={{ flex: 1, height: 32, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text variant="tab" color={colors.text.muted}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ gap: spacing[1], paddingHorizontal: spacing[1] }}>
            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={{ flexDirection: 'row' }}>
                {week.map((iso, dayIndex) => {
                  if (!iso) {
                    return (
                      <View
                        key={`blank-${weekIndex}-${dayIndex}`}
                        style={{ flex: 1, height: 44 }}
                      />
                    );
                  }

                  const isSelected = iso === selectedDate;
                  const isToday = iso === todayIso;
                  const isDisabled = iso < minDateIso || iso > maxDateIso;

                  return (
                    <DayCell
                      key={iso}
                      iso={iso}
                      isSelected={isSelected}
                      isToday={isToday}
                      isDisabled={isDisabled}
                      onPress={onSelectDate}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar calendário"
            onPress={onClose}
            style={({ pressed }) => ({
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              marginTop: spacing[2],
              marginHorizontal: spacing[2],
              backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
              borderWidth: 1,
              borderColor: colors.border.default,
            })}
          >
            <Text variant="bodySm" color={colors.text.primary}>
              Cancelar
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
