import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandMark } from '@/shared/brand';
import { useSession } from '@/features/auth';
import { useTheme } from '@/shared/theme';
import { Badge, Text, useToast } from '@/shared/ui';
import { openPublicCatalog, sharePublicCatalog } from './catalog-share.helper';
import { useNavigation } from './navigation-context';
import type { AppDestination } from './navigation.types';

export function DesktopSidebar() {
  const { colors, spacing, radius, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const { staff, barbershop, isOwner, signOut } = useSession();
  const { activeDestination } = useNavigation();
  const { showToast } = useToast();

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  const handleShareCatalog = async () => {
    await sharePublicCatalog({
      barbershopId: barbershop?.id,
      barbershopName: barbershop?.name,
      onSuccess: (msg) => showToast(msg, 'success'),
      onError: (err) => showToast(err.message, 'error'),
    });
  };

  const handleOpenCatalog = async () => {
    await openPublicCatalog(barbershop?.id);
  };

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
      accessibilityRole="menu"
      accessibilityLabel="Menu de navegação desktop"
      style={[
        styles.sidebarContainer,
        {
          backgroundColor: isDark ? '#121212' : colors.surface.elevated,
          borderRightColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.subtle,
          paddingVertical: spacing[5],
        },
      ]}
    >
      {/* Topo da Sidebar: Marca & Barba */}
      <View style={[styles.brandHeader, { paddingHorizontal: spacing[5], gap: spacing[3] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          <BrandMark
            variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
            size={32}
            decorative={false}
            accessibilityLabel="Smart Barber Logo"
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="subhead" weight="bold" color={colors.text.primary} numberOfLines={1}>
              {barbershop?.name || 'Smart Barber'}
            </Text>
            <Text variant="caption" color={colors.text.muted}>
              Painel Operacional
            </Text>
          </View>
        </View>

        {/* Card do Usuário Logado */}
        <View
          style={[
            styles.userCard,
            {
              backgroundColor: isDark ? '#191919' : colors.surface.input,
              borderColor: colors.border.subtle,
              borderRadius: radius.md,
              padding: spacing[3],
            },
          ]}
        >
          <View
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

          <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
            <Text
              variant="bodySm"
              weight="bold"
              color={colors.text.primary}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {staff?.name || barbershop?.name || 'Profissional'}
            </Text>
            <Badge
              label={isOwner ? 'Proprietário' : 'Barbeiro'}
              tone={isOwner ? 'brand' : 'success'}
              style={{ alignSelf: 'flex-start', transform: [{ scale: 0.85 }] }}
            />
          </View>
        </View>
      </View>

      {/* Conteúdo rolável de grupos e itens */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[4],
          gap: spacing[5],
        }}
      >
        {/* Grupo 1: Operação Principal */}
        <View style={styles.menuGroup}>
          <Text
            variant="caption"
            weight="bold"
            color={colors.text.muted}
            style={styles.groupTitle}
          >
            OPERAÇÃO
          </Text>

          <SidebarItem
            label="Início"
            icon="home-outline"
            activeIcon="home"
            isActive={activeDestination === 'home'}
            onPress={() => handleNavigate('/(app)')}
          />
          <SidebarItem
            label="Agenda"
            icon="calendar-outline"
            activeIcon="calendar"
            isActive={activeDestination === 'agenda'}
            onPress={() => handleNavigate('/(app)/agenda')}
          />
          <SidebarItem
            label="Horários"
            icon="time-outline"
            activeIcon="time"
            isActive={activeDestination === 'availability'}
            onPress={() => handleNavigate('/(app)/availability')}
          />
          <SidebarItem
            label="Serviços"
            icon="cut-outline"
            activeIcon="cut"
            isActive={activeDestination === 'services'}
            onPress={() => handleNavigate('/(app)/services')}
          />
        </View>

        {/* Grupo 2: Catálogo Público */}
        <View style={styles.menuGroup}>
          <Text
            variant="caption"
            weight="bold"
            color={colors.text.muted}
            style={styles.groupTitle}
          >
            CATÁLOGO PÚBLICO
          </Text>

          <SidebarItem
            label="Abrir Catálogo"
            icon="globe-outline"
            activeIcon="globe"
            isActive={false}
            onPress={handleOpenCatalog}
          />
          <SidebarItem
            label="Compartilhar Link"
            icon="share-social-outline"
            activeIcon="share-social"
            isActive={false}
            onPress={handleShareCatalog}
          />
        </View>

        {/* Grupo 3: Preferências e Conta */}
        <View style={styles.menuGroup}>
          <Text
            variant="caption"
            weight="bold"
            color={colors.text.muted}
            style={styles.groupTitle}
          >
            SISTEMA & CONTA
          </Text>

          <SidebarItem
            label={isDark ? 'Tema Claro' : 'Tema Escuro'}
            icon={isDark ? 'sunny-outline' : 'moon-outline'}
            activeIcon={isDark ? 'sunny' : 'moon'}
            isActive={false}
            onPress={toggleTheme}
          />
          <SidebarItem
            label="Sair da Conta"
            icon="log-out-outline"
            activeIcon="log-out"
            isActive={false}
            destructive
            onPress={() => void signOut()}
          />
        </View>
      </ScrollView>
    </View>
  );
}

interface SidebarItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  destructive?: boolean;
  onPress: () => void;
}

function SidebarItem({
  label,
  icon,
  activeIcon,
  isActive,
  destructive = false,
  onPress,
}: SidebarItemProps) {
  const { colors, radius, spacing } = useTheme();

  const textColor = destructive
    ? colors.feedback.error
    : isActive
      ? colors.text.inverse
      : colors.text.primary;

  const iconColor = destructive
    ? colors.feedback.error
    : isActive
      ? colors.text.inverse
      : colors.text.secondary;

  const backgroundColor = isActive ? colors.brand.primary : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          borderRadius: radius.md,
          backgroundColor: isActive
            ? backgroundColor
            : pressed
              ? colors.surface.selected
              : 'transparent',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[3],
        },
      ]}
    >
      <Ionicons
        name={isActive ? activeIcon : icon}
        size={20}
        color={iconColor}
        style={{ marginRight: spacing[3] }}
      />
      <Text
        variant="bodySm"
        weight={isActive ? 'bold' : 'medium'}
        style={{ color: textColor, flex: 1 }}
      >
        {label}
      </Text>
      {isActive ? (
        <Ionicons name="chevron-forward" size={16} color={textColor} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 260,
    height: '100%',
    borderRightWidth: 1,
    flexShrink: 0,
  },
  brandHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuGroup: {
    gap: 4,
  },
  groupTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
