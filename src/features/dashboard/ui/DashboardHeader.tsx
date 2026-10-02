import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Text } from '@/shared/ui';
import { useNavigation } from '@/shared/navigation';
import type { Staff } from '@/entities/staff';

interface DashboardHeaderProps {
  staff: Staff | null;
  greeting: string;
  isOwner: boolean;
}

export function DashboardHeader({ staff, greeting, isOwner }: DashboardHeaderProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const { openDrawer } = useNavigation();

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const initials = staff?.name
    ? staff.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'SB';

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingHorizontal: isCompact ? spacing[4] : spacing[6],
          paddingVertical: spacing[3],
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.subtle,
          backgroundColor: isDark ? 'rgba(11, 11, 11, 0.78)' : 'rgba(255, 255, 255, 0.82)',
        },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } as any)
          : null,
      ]}
    >
      {/* Lado Esquerdo: Hamburger (no mobile) + BrandMark + Saudação & Data */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        {!isExpanded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menu de navegação"
            onPress={openDrawer}
            style={({ pressed }) => [
              styles.menuButton,
              {
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.surface.selected : colors.surface.input,
                borderColor: colors.border.default,
              },
            ]}
          >
            <Ionicons name="menu-outline" size={22} color={colors.text.primary} />
          </Pressable>
        ) : null}

        <BrandMark
          variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
          size={32}
          decorative={false}
          accessibilityLabel="Smart Barber Logo"
        />

        <View style={{ gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Text variant="subhead" weight="bold" color={colors.text.primary}>
              {greeting}
            </Text>
            <Badge
              label={isOwner ? 'Proprietário' : 'Barbeiro'}
              tone={isOwner ? 'brand' : 'success'}
              style={{ transform: [{ scale: 0.85 }] }}
            />
          </View>
          <Text variant="caption" color={colors.text.muted}>
            {capitalizedDate} · Painel do dia
          </Text>
        </View>
      </View>

      {/* Lado Direito: Avatar do profissional */}
      <View
        accessibilityLabel={`Perfil de ${staff?.name ?? 'Profissional'}`}
        style={[
          styles.avatar,
          {
            borderRadius: radius.full,
            backgroundColor: colors.surface.elevated,
            borderColor: colors.brand.primary,
          },
        ]}
      >
        <Text variant="caption" color={colors.text.primary} weight="bold">
          {initials}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
