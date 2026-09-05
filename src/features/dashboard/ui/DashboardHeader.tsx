import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandMark } from '@/shared/brand';
import { useAdaptiveLayout, useTheme } from '@/shared/theme';
import { Badge, Button, Text } from '@/shared/ui';
import type { Staff } from '@/entities/staff';

interface DashboardHeaderProps {
  staff: Staff | null;
  greeting: string;
  isOwner: boolean;
  onSignOut: () => void;
}

export function DashboardHeader({ staff, greeting, isOwner, onSignOut }: DashboardHeaderProps) {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const { isCompact } = useAdaptiveLayout();

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Iniciais do profissional
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
      style={{
        width: '100%',
        paddingHorizontal: isCompact ? spacing[4] : spacing[6],
        paddingVertical: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        backgroundColor: colors.background.primary,
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: isCompact ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: spacing[3],
      }}
    >
      {/* Lado Esquerdo: Marca & Data */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <BrandMark
          variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
          size={36}
          decorative={false}
          accessibilityLabel="Smart Barber Logo"
        />
        <View style={{ gap: 2 }}>
          <Text variant="caption" color={colors.text.muted}>
            {capitalizedDate}
          </Text>
          <Text variant="h2" color={colors.text.primary}>
            {greeting}
          </Text>
        </View>
      </View>

      {/* Lado Direito: Perfil, Badge, Alternador de Tema e Sair */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: isCompact ? 'flex-end' : 'center',
          gap: spacing[3],
        }}
      >
        <Badge
          label={isOwner ? 'Proprietário' : 'Barbeiro'}
          tone={isOwner ? 'brand' : 'success'}
        />

        {/* Avatar Circular com Monograma */}
        <View
          accessibilityLabel={`Avatar de ${staff?.name ?? 'Profissional'}`}
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.full,
            backgroundColor: colors.surface.elevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.brand.primary,
          }}
        >
          <Text variant="badge" color={colors.text.primary} weight="bold">
            {initials}
          </Text>
        </View>

        {/* Alternador de Tema */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          onPress={toggleTheme}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border.default,
            backgroundColor: pressed ? colors.surface.selected : colors.surface.default,
          })}
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={18}
            color={colors.text.secondary}
          />
        </Pressable>

        {/* Botão Sair */}
        <Button
          title={isCompact ? '' : 'Sair'}
          variant="outline"
          leftIcon={<Ionicons name="log-out-outline" size={16} color={colors.text.secondary} />}
          onPress={onSignOut}
          style={{
            minHeight: 38,
            paddingHorizontal: isCompact ? spacing[3] : spacing[4],
            paddingVertical: spacing[1],
          }}
        />
      </View>
    </View>
  );
}
