import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/shared/ui';
import { useTheme } from '@/shared/theme';
import { maskDateInput } from './input-masks'

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const WEEKDAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatCalendarDate(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function getMonthCells(year: number, monthIndex: number): Array<number | null> {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const mondayFirstOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = [];

  for (let i = 0; i < mondayFirstOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/**
 * Campo de data digitável + calendário universal, sem dependência externa.
 * O calendário apenas produz a mesma string YYYY-MM-DD já usada pelo formulário/API.
 */
export function DatePickerInput({
  value,
  onChange,
  onBlur,
  disabled,
}: DatePickerInputProps) {
  const { colors, spacing, radius } = useTheme();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDate(value);
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const cells = useMemo(() => getMonthCells(year, monthIndex), [year, monthIndex]);
  const today = new Date();
  const todayValue = formatCalendarDate(today.getFullYear(), today.getMonth(), today.getDate());

  function openCalendar() {
    if (disabled) return;

    const selected = parseDate(value);
    const base = selected ?? new Date();
    setVisibleMonth(new Date(base.getFullYear(), base.getMonth(), 1));
    setCalendarOpen(true);
  }

  function changeMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function chooseDay(day: number) {
    onChange(formatCalendarDate(year, monthIndex, day));
    setCalendarOpen(false);
    onBlur?.();
  }

  return (
    <>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(maskDateInput(text))}
        onBlur={onBlur}
        placeholder="2026-12-25"
        keyboardType="numeric"
        maxLength={10}
        editable={!disabled}
        accessibilityLabel="Data da exceção"
        inputStyle={styles.numericInput}
        leftIcon={
          <Ionicons name="calendar-outline" size={18} color={colors.text.secondary} />
        }
        rightIcon={
          <Pressable
            onPress={openCalendar}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Abrir calendário"
            hitSlop={8}
            style={({ pressed }) => [
              styles.calendarButton,
              {
                backgroundColor: pressed ? colors.surface.selected : colors.surface.elevated,
                borderColor: colors.border.subtle,
                borderRadius: radius.sm,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <Ionicons name="calendar" size={18} color={colors.brand.primary} />
          </Pressable>
        }
      />

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View style={[styles.overlay, { backgroundColor: colors.background.overlay }]}> 
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCalendarOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Fechar calendário"
          />

          <View
            style={[
              styles.calendar,
              {
                backgroundColor: colors.background.card,
                borderColor: colors.border.subtle,
                borderRadius: radius.lg,
                padding: spacing[4],
              },
            ]}
          >
            <View style={styles.calendarTopRow}>
              <View style={styles.calendarTitleBlock}>
                <Text variant="h3" color={colors.text.primary}>
                  Selecionar data
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  {MONTHS[monthIndex]} de {year}
                </Text>
              </View>

              <Pressable
                onPress={() => setCalendarOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Fechar calendário"
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Ionicons name="close" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>

            <View style={styles.monthNavigation}>
              <Pressable
                onPress={() => changeMonth(-1)}
                accessibilityRole="button"
                accessibilityLabel="Mês anterior"
                style={({ pressed }) => [
                  styles.navButton,
                  {
                    backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
              </Pressable>

              <Pressable
                onPress={() => {
                  const now = new Date();
                  setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                accessibilityRole="button"
                accessibilityLabel="Ir para o mês atual"
                style={({ pressed }) => [
                  styles.todayButton,
                  {
                    backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Text variant="caption" color={colors.text.primary}>
                  Hoje
                </Text>
              </Pressable>

              <Pressable
                onPress={() => changeMonth(1)}
                accessibilityRole="button"
                accessibilityLabel="Próximo mês"
                style={({ pressed }) => [
                  styles.navButton,
                  {
                    backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
                    borderColor: colors.border.subtle,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.weekHeader}>
              {WEEKDAYS.map((weekday) => (
                <View key={weekday} style={styles.dayCell}>
                  <Text variant="badge" color={colors.text.muted}>
                    {weekday}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {cells.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const dateValue = formatCalendarDate(year, monthIndex, day);
                const selected = dateValue === value;
                const isToday = dateValue === todayValue;

                return (
                  <View key={dateValue} style={styles.dayCell}>
                    <Pressable
                      onPress={() => chooseDay(day)}
                      accessibilityRole="button"
                      accessibilityLabel={`Selecionar ${dateValue}`}
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.dayButton,
                        {
                          borderRadius: radius.md,
                          backgroundColor: selected
                            ? colors.brand.primary
                            : pressed
                              ? colors.surface.selected
                              : 'transparent',
                          borderColor: isToday && !selected
                            ? colors.brand.primary
                            : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        variant="bodySm"
                        color={selected ? colors.text.inverse : colors.text.primary}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  numericInput: { fontVariant: ['tabular-nums'] },
  calendarButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calendar: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    gap: 16,
  },
  calendarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarTitleBlock: { flex: 1, gap: 2 },
  iconButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    minHeight: 44,
    minWidth: 84,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: { flexDirection: 'row' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});