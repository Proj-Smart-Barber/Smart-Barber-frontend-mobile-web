import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Button, Spinner, Text } from '@/shared/ui';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';

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
  onBack: () => void;
  onNewBooking?: () => void;
  isUnitActive?: boolean;
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

function BackButton({ onPress }: { onPress: () => void }) {
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
      }}
      contentStyle={{
        width: '100%',
        height: '100%',
        padding: 0,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar para o início"
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
        <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
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
  onBack,
  onNewBooking,
  isUnitActive = true,
  isOwner,
  professionals,
  selectedProfessionalId,
  onSelectProfessional,
}: AgendaHeaderProps) {
  const { colors, spacing, radius, isDark } = useTheme();
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

          {onNewBooking ? (
            <Button
              variant="primary"
              title={isCompact ? '+ Novo' : '+ Novo agendamento'}
              onPress={isUnitActive ? onNewBooking : undefined}
              disabled={!isUnitActive}
              accessibilityHint={
                !isUnitActive
                  ? 'Unidade inativa: novos agendamentos não são permitidos nesta barbearia'
                  : 'Criar novo agendamento para cliente'
              }
              style={{
                minHeight: 44,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
                opacity: isUnitActive ? 1 : 0.5,
              }}
            />
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

      {/* Seletor de Profissionais para OWNER */}
      {isOwner && professionals && professionals.length > 0 && onSelectProfessional ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            paddingVertical: spacing[1],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver agenda de todos os profissionais"
            onPress={() => onSelectProfessional(null)}
            style={({ pressed }) => ({
              minHeight: 36,
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[1],
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor:
                selectedProfessionalId === null ? colors.brand.primary : colors.border.subtle,
              backgroundColor:
                selectedProfessionalId === null
                  ? colors.brand.primary
                  : pressed
                  ? colors.surface.selected
                  : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Text
              variant="caption"
              weight={selectedProfessionalId === null ? 'bold' : 'regular'}
              color={selectedProfessionalId === null ? '#FFFFFF' : colors.text.secondary}
            >
              Todos os profissionais
            </Text>
          </Pressable>

          {professionals.map((prof) => {
            const isSelected = selectedProfessionalId === prof.id;
            return (
              <Pressable
                key={prof.id}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar agenda para ${prof.name}`}
                onPress={() => onSelectProfessional(prof.id)}
                style={({ pressed }) => ({
                  minHeight: 36,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[1],
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.brand.primary : colors.border.subtle,
                  backgroundColor: isSelected
                    ? colors.brand.primary
                    : pressed
                    ? colors.surface.selected
                    : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                })}
              >
                <Text
                  variant="caption"
                  weight={isSelected ? 'bold' : 'regular'}
                  color={isSelected ? '#FFFFFF' : colors.text.secondary}
                >
                  {prof.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
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
