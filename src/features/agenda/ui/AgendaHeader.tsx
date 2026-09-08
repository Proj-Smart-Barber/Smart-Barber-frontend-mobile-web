import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button, Spinner, Text } from '@/shared/ui';

interface AgendaHeaderProps {
  dateLabel: string;
  dateLabelShort: string;
  isToday: boolean;
  canGoToPreviousDay: boolean;
  canGoToNextDay: boolean;
  isUpdatingDate: boolean;
  lastUpdatedAtLabel: string | null;
  onGoToPreviousDay: () => void;
  onGoToNextDay: () => void;
  onGoToToday: () => void;
  onOpenDatePicker: () => void;
  onBack: () => void;
}

function DayNavButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
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
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.text.primary} />
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const { colors, radius } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voltar para o início"
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
      <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
    </Pressable>
  );
}

export function AgendaHeader({
  dateLabel,
  dateLabelShort,
  isToday,
  canGoToPreviousDay,
  canGoToNextDay,
  isUpdatingDate,
  lastUpdatedAtLabel,
  onGoToPreviousDay,
  onGoToNextDay,
  onGoToToday,
  onOpenDatePicker,
  onBack,
}: AgendaHeaderProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const [datePickerFocused, setDatePickerFocused] = useState(false);
  const displayedDateLabel = isCompact ? dateLabelShort : dateLabel;

  return (
    <View
      style={{
        width: '100%',
        paddingHorizontal: isCompact ? spacing[4] : spacing[6],
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        backgroundColor: colors.background.primary,
        gap: spacing[3],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[3],
        }}
      >
        <BackButton onPress={onBack} />

        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            variant="h1"
            color={colors.text.primary}
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Agenda
          </Text>
          {lastUpdatedAtLabel ? (
            <Text variant="caption" color={colors.text.muted} numberOfLines={1} ellipsizeMode="tail">
              {lastUpdatedAtLabel}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            flexShrink: 0,
          }}
        >
          {isUpdatingDate ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
              accessibilityRole="alert"
              accessibilityLabel="Atualizando agenda"
            >
              <Spinner size="small" />
              {!isCompact ? (
                <Text variant="caption" color={colors.text.secondary}>
                  Atualizando…
                </Text>
              ) : null}
            </View>
          ) : null}
          {!isToday ? (
            <Button
              variant="outline"
              title="Hoje"
              onPress={onGoToToday}
              style={{ minHeight: 44, paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}
            />
          ) : null}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[3],
        }}
      >
        <DayNavButton
          icon="chevron-back"
          label="Dia anterior"
          disabled={!canGoToPreviousDay}
          onPress={onGoToPreviousDay}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Escolher data"
          accessibilityHint="Abre o calendário para selecionar o dia da agenda"
          onPress={onOpenDatePicker}
          onFocus={() => setDatePickerFocused(true)}
          onBlur={() => setDatePickerFocused(false)}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            flexShrink: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            minHeight: 44,
            paddingHorizontal: isCompact ? spacing[2] : spacing[3],
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
            borderWidth: datePickerFocused ? 2 : 1,
            borderColor: datePickerFocused ? colors.border.focus : colors.border.default,
          })}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={colors.text.primary}
            style={{ flexShrink: 0 }}
          />
          <Text
            variant="subhead"
            color={colors.text.primary}
            style={{ textAlign: 'center', flexShrink: 1 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {displayedDateLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={colors.text.secondary}
            style={{ flexShrink: 0 }}
          />
        </Pressable>
        <DayNavButton
          icon="chevron-forward"
          label="Próximo dia"
          disabled={!canGoToNextDay}
          onPress={onGoToNextDay}
        />
      </View>
    </View>
  );
}
