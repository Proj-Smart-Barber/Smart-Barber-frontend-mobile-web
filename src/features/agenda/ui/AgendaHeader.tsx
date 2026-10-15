import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { useNavigation } from '@/shared/navigation/navigation-context';
import { Button, Spinner, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import { ProfessionalFilterSelector } from './ProfessionalFilterSelector';

interface AgendaHeaderProps {
  dateLabel: string;
  dateLabelShort: string;
  isToday: boolean;
  canGoToPreviousDay: boolean;
  canGoToNextDay: boolean;
  isUpdatingDate: boolean;
  lastUpdatedAtLabel: string | null;
  unitName?: string;
  roleLabel?: string;
  onGoToPreviousDay: () => void;
  onGoToNextDay: () => void;
  onGoToToday: () => void;
  onOpenDatePicker: () => void;
  isOwner?: boolean;
  professionals?: Array<{ id: string; name: string }>;
  selectedProfessionalId?: string | null;
  onSelectProfessional?: (id: string | null) => void;
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
    <LiquidGlassView
      variant="navigation"
      borderRadius={radius.md}
      elevated={false}
      borderColor={focused ? colors.border.focus : undefined}
      borderWidth={focused ? 2 : 1}
      style={{
        width: 44,
        height: 44,
        opacity: disabled ? 0.4 : 1,
      }}
      contentStyle={{
        width: '100%',
        height: '100%',
        padding: 0,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => ({
          flex: 1,
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.surface.selected : 'transparent',
          borderRadius: radius.md,
        })}
      >
        <Ionicons name={icon} size={20} color={colors.text.primary} />
      </Pressable>
    </LiquidGlassView>
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
  unitName,
  roleLabel,
  onGoToPreviousDay,
  onGoToNextDay,
  onGoToToday,
  onOpenDatePicker,
  isOwner,
  professionals,
  selectedProfessionalId,
  onSelectProfessional,
}: AgendaHeaderProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const { openDrawer } = useNavigation();
  const [datePickerFocused, setDatePickerFocused] = useState(false);
  const displayedDateLabel = isCompact ? dateLabelShort : dateLabel;

  return (
    <View
      style={{
        width: '100%',
        paddingHorizontal: isCompact ? spacing[4] : spacing[6],
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.subtle,
        backgroundColor: 'transparent',
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
        {isCompact ? (
          <LiquidGlassView
            variant="navigation"
            borderRadius={radius.md}
            elevated={false}
            style={{ width: 44, height: 44, flexShrink: 0 }}
            contentStyle={{ padding: 0, width: '100%', height: '100%' }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir menu de navegação"
              onPress={openDrawer}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.surface.selected : 'transparent',
              })}
            >
              <Ionicons name="menu-outline" size={22} color={colors.text.primary} />
            </Pressable>
          </LiquidGlassView>
        ) : null}

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
          {unitName || roleLabel ? (
            <Text variant="caption" color={colors.text.secondary} numberOfLines={1} ellipsizeMode="tail">
              {[unitName, roleLabel].filter(Boolean).join(' • ')}
            </Text>
          ) : lastUpdatedAtLabel ? (
            <Text variant="caption" color={colors.text.muted} numberOfLines={1} ellipsizeMode="tail">
              {lastUpdatedAtLabel}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
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
              style={{ minHeight: 44, paddingHorizontal: spacing[3], paddingVertical: spacing[2] }}
            />
          ) : null}
        </View>
      </View>

      {/* Filtro compacto de profissional para OWNER */}
      {isOwner && professionals && professionals.length > 0 && onSelectProfessional ? (
        <ProfessionalFilterSelector
          professionals={professionals}
          selectedProfessionalId={selectedProfessionalId ?? null}
          onSelectProfessional={onSelectProfessional}
        />
      ) : null}

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
        <LiquidGlassView
          variant="navigation"
          borderRadius={radius.md}
          elevated={false}
          borderColor={datePickerFocused ? colors.border.focus : undefined}
          borderWidth={datePickerFocused ? 2 : 1}
          style={{
            flex: 1,
            minWidth: 0,
          }}
          contentStyle={{
            padding: 0,
            width: '100%',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escolher data"
            accessibilityHint="Abre o calendário para selecionar o dia da agenda"
            onPress={onOpenDatePicker}
            onFocus={() => setDatePickerFocused(true)}
            onBlur={() => setDatePickerFocused(false)}
            style={({ pressed }) => ({
              width: '100%',
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[2],
              paddingHorizontal: isCompact ? spacing[2] : spacing[3],
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.surface.selected : 'transparent',
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
        </LiquidGlassView>
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
