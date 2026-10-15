import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { BrandMark } from '@/shared/brand';
import { useSession } from '@/features/auth';
import { LiquidGlassView } from './LiquidGlassView';

export interface ClientNavigationShellProps {
  children: React.ReactNode;
}

interface ClientTabItem {
  id: string;
  label: string;
  route: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const CLIENT_TABS: ClientTabItem[] = [
  {
    id: 'home',
    label: 'Início',
    route: '/(client)',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    id: 'explore',
    label: 'Explorar',
    route: '/(client)/explore',
    iconActive: 'compass',
    iconInactive: 'compass-outline',
  },
  {
    id: 'bookings',
    label: 'Agendamentos',
    route: '/(client)/bookings',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
];

export function ClientNavigationShell({ children }: ClientNavigationShellProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { identity, signOut } = useSession();

  const isCurrentRoute = (route: string) => {
    if (route === '/(client)' && (pathname === '/(client)' || pathname === '/(client)/')) {
      return true;
    }
    return pathname.startsWith(route) && route !== '/(client)';
  };

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  const userName = identity?.name || 'Cliente';
  const userEmail = identity?.email || '';

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background.primary }]}>
      {/* Layout Desktop: Sidebar + Área de Conteúdo */}
      {!isCompact && (
        <View style={styles.desktopSidebarContainer}>
          <LiquidGlassView
            variant="sidebar"
            style={[
              styles.desktopSidebar,
              {
                borderRadius: radius.xl,
                borderColor: colors.border.subtle,
              },
            ]}
          >
            {/* Topo: Marca */}
            <View style={styles.desktopBrandRow}>
              <BrandMark variant="symbol-crimson" size={32} />
              <View style={styles.brandTitleCol}>
                <Text variant="body" weight="bold" style={styles.brandTitle}>
                  Smart Barber
                </Text>
                <Text variant="caption" color={colors.text.secondary}>
                  Área do Cliente
                </Text>
              </View>
            </View>

            {/* Menu de Destinos */}
            <View style={styles.desktopNavGroup}>
              {CLIENT_TABS.map((tab) => {
                const active = isCurrentRoute(tab.route);
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => handleNavigate(tab.route)}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.desktopNavItem,
                      {
                        backgroundColor: active
                          ? colors.surface.selected
                          : 'transparent',
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <Ionicons
                      name={active ? tab.iconActive : tab.iconInactive}
                      size={20}
                      color={active ? colors.brand.primary : colors.text.secondary}
                      style={styles.desktopNavIcon}
                    />
                    <Text
                      variant="body"
                      weight={active ? 'bold' : 'regular'}
                      style={[
                        styles.desktopNavLabel,
                        {
                          color: active ? colors.text.primary : colors.text.secondary,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Rodapé da Sidebar: Perfil e Sair */}
            <View
              style={[
                styles.desktopUserFooter,
                { borderTopColor: colors.border.subtle },
              ]}
            >
              <View style={styles.userAvatarRow}>
                <View
                  style={[
                    styles.userAvatarBadge,
                    {
                      backgroundColor: colors.surface.input,
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Text variant="caption" style={styles.userAvatarChar}>
                    {userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfoCol}>
                  <Text variant="caption" weight="medium" numberOfLines={1}>
                    {userName}
                  </Text>
                  <Text
                    variant="caption"
                    color={colors.text.secondary}
                    numberOfLines={1}
                  >
                    {userEmail}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => signOut()}
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
                style={styles.logoutButton}
              >
                <Ionicons
                  name="log-out-outline"
                  size={16}
                  color={colors.text.secondary}
                />
                <Text variant="caption" color={colors.text.secondary}>
                  Sair
                </Text>
              </Pressable>
            </View>
          </LiquidGlassView>
        </View>
      )}

      {/* Conteúdo Central */}
      <View style={styles.mainContent}>
        {children}
      </View>

      {/* Layout Mobile: Bottom Capsule Bar */}
      {isCompact && (
        <View
          style={[
            styles.mobileCapsuleWrapper,
            { bottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <LiquidGlassView
            style={[
              styles.mobileCapsuleBar,
              {
                borderRadius: radius.full,
                borderColor: colors.border.subtle,
              },
            ]}
          >
            {CLIENT_TABS.map((tab) => {
              const active = isCurrentRoute(tab.route);
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => handleNavigate(tab.route)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={styles.mobileTabButton}
                >
                  <Ionicons
                    name={active ? tab.iconActive : tab.iconInactive}
                    size={22}
                    color={active ? colors.brand.primary : colors.text.secondary}
                  />
                  <Text
                    variant="caption"
                    style={[
                      styles.mobileTabLabel,
                      {
                        color: active ? colors.brand.primary : colors.text.secondary,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </LiquidGlassView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebarContainer: {
    width: 260,
    padding: 16,
    height: '100%',
  },
  desktopSidebar: {
    flex: 1,
    padding: 18,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  desktopBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  brandTitleCol: {
    marginLeft: 10,
  },
  brandTitle: {
    fontWeight: '800',
  },
  desktopNavGroup: {
    flex: 1,
    gap: 8,
  },
  desktopNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  desktopNavIcon: {
    marginRight: 12,
  },
  desktopNavLabel: {
    fontSize: 14,
  },
  desktopUserFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  userAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarBadge: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userAvatarChar: {
    fontWeight: '700',
  },
  userInfoCol: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  mainContent: {
    flex: 1,
  },
  mobileCapsuleWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  mobileCapsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 380,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  mobileTabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  mobileTabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
