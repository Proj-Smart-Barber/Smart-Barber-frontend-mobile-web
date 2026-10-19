import React, { useEffect } from 'react';
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout, useReducedMotion } from '@/shared/theme';
import { Badge, Text } from '@/shared/ui';
import { BrandMark } from '@/shared/brand';
import { useSession } from '@/features/auth';
import { LiquidGlassView } from './LiquidGlassView';
import { NavigationProvider, useNavigation } from './navigation-context';

export interface ClientNavigationShellProps {
  children: React.ReactNode;
}

interface ClientNavItem {
  id: string;
  label: string;
  compactLabel?: string;
  route: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const PRIMARY_CLIENT_TABS: ClientNavItem[] = [
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
    compactLabel: 'Agenda',
    route: '/(client)/bookings',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
  {
    id: 'profile',
    label: 'Minha Conta',
    compactLabel: 'Conta',
    route: '/(client)/profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

const ACCOUNT_CLIENT_ITEMS: ClientNavItem[] = [
  {
    id: 'notifications',
    label: 'Notificações',
    route: '/(client)/notifications',
    iconActive: 'notifications',
    iconInactive: 'notifications-outline',
  },
  {
    id: 'profile-settings',
    label: 'Minha Conta',
    route: '/(client)/profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
];

function getInitials(name?: string | null): string {
  if (!name) return 'CL';
  const parts = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase());
  return parts.length > 0 ? parts.join('') : 'CL';
}

function isRouteActive(pathname: string, route: string): boolean {
  if (route === '/(client)') {
    return (
      pathname === '/' ||
      pathname === '/(client)' ||
      pathname === '/(client)/'
    );
  }
  const normalizedTarget = route.replace('/(client)', '');
  return (
    pathname === route ||
    pathname.startsWith(`${route}/`) ||
    (normalizedTarget.length > 1 &&
      (pathname === normalizedTarget || pathname.startsWith(`${normalizedTarget}/`)))
  );
}

function ClientNavigationShellContent({ children }: ClientNavigationShellProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  const { isExpanded, isCompact } = useAdaptiveLayout();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { identity, signOut } = useSession();
  const reducedMotion = useReducedMotion();
  const {
    isDrawerOpen,
    isDrawerVisible,
    drawerProgress,
    closeDrawer,
    scrollCollapseProgress,
  } = useNavigation();

  const userName = identity?.name || 'Cliente';
  const initials = getInitials(userName);

  const handleNavigate = (route: string) => {
    if (isDrawerOpen) {
      closeDrawer();
    }
    router.push(route as any);
  };

  const handleSignOut = () => {
    if (isDrawerOpen) {
      closeDrawer();
    }
    void signOut();
  };

  const webBackgroundStyle: any =
    Platform.OS === 'web'
      ? {
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 20% 18%, rgba(124, 135, 159, 0.17), transparent 50%), radial-gradient(ellipse at 82% 57%, rgba(155, 41, 49, 0.105), transparent 55%), #0b0b0b'
            : 'radial-gradient(ellipse at 20% 18%, rgba(159, 170, 191, 0.23), transparent 50%), radial-gradient(ellipse at 80% 60%, rgba(189, 32, 38, 0.06), transparent 55%), #f7f5f3',
        }
      : {};

  // Tecla Escape na Web e BackHandler no Android para fechar o Drawer
  useEffect(() => {
    if (!isDrawerOpen) return;

    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        closeDrawer();
        return true;
      });
      return () => backHandler.remove();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeDrawer();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDrawerOpen, closeDrawer]);

  // Layout Desktop / Expandido (>= 840px): Sidebar idêntica ao padrão do Owner
  if (isExpanded) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.primary, flexDirection: 'row' },
          webBackgroundStyle,
        ]}
      >
        <View
          accessibilityRole="menu"
          accessibilityLabel="Menu de navegação desktop"
          style={styles.sidebarSlot}
        >
          <LiquidGlassView
            variant="sidebar"
            borderRadius={30}
            elevated
            style={styles.glassWrapper}
            contentStyle={[styles.glassContent, { paddingVertical: spacing[5] }]}
          >
            {/* Topo da Sidebar: Marca Oficial & Card do Usuário */}
            <View style={[styles.brandHeader, { paddingHorizontal: spacing[4], gap: spacing[3] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <BrandMark
                  variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                  size={34}
                  decorative={false}
                  accessibilityLabel="Smart Barber Logo"
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="subhead" weight="bold" color={colors.text.primary} numberOfLines={1}>
                    Smart Barber
                  </Text>
                  <Text variant="caption" color={colors.text.muted}>
                    Área do Cliente
                  </Text>
                </View>
              </View>

              {/* Card do Usuário Logado (Padrão Owner) */}
              <Pressable
                onPress={() => handleNavigate('/(client)/profile')}
                accessibilityRole="button"
                accessibilityLabel={`Perfil de ${userName}`}
                style={[
                  styles.userCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
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
                  <Text
                    variant="caption"
                    color={colors.text.primary}
                    weight="bold"
                    style={{ lineHeight: 14, textAlign: 'center' }}
                  >
                    {initials}
                  </Text>
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: 3, justifyContent: 'center' }}>
                  <Text
                    variant="bodySm"
                    weight="bold"
                    color={colors.text.primary}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {userName}
                  </Text>
                  <Badge
                    label="Cliente"
                    tone="brand"
                    size="sm"
                  />
                </View>
              </Pressable>
            </View>

            {/* Grupos de Navegação */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[3],
                gap: spacing[4],
              }}
            >
              <View style={styles.menuGroup}>
                <Text
                  variant="caption"
                  weight="bold"
                  color={colors.text.muted}
                  style={styles.groupTitle}
                >
                  DESCOBERTA & AGENDA
                </Text>

                {PRIMARY_CLIENT_TABS.slice(0, 3).map((item) => (
                  <ClientSidebarItem
                    key={item.id}
                    label={item.label}
                    icon={item.iconInactive}
                    activeIcon={item.iconActive}
                    isActive={isRouteActive(pathname, item.route)}
                    onPress={() => handleNavigate(item.route)}
                  />
                ))}
              </View>

              <View style={styles.menuGroup}>
                <Text
                  variant="caption"
                  weight="bold"
                  color={colors.text.muted}
                  style={styles.groupTitle}
                >
                  SISTEMA & CONTA
                </Text>

                {ACCOUNT_CLIENT_ITEMS.map((item) => (
                  <ClientSidebarItem
                    key={item.id}
                    label={item.label}
                    icon={item.iconInactive}
                    activeIcon={item.iconActive}
                    isActive={isRouteActive(pathname, item.route)}
                    onPress={() => handleNavigate(item.route)}
                  />
                ))}

                <ClientSidebarItem
                  label="Sair da Conta"
                  icon="log-out-outline"
                  activeIcon="log-out"
                  isActive={false}
                  destructive
                  onPress={handleSignOut}
                />
              </View>
            </ScrollView>
          </LiquidGlassView>
        </View>

        <View style={styles.desktopContent}>{children}</View>
      </View>
    );
  }

  // Layout Mobile / Tablet Compacto: LeftDrawer (Threads shift) + BottomCapsuleBar
  const drawerWidth = Math.min(320, Math.round(width * 0.85));
  const pageShift = Math.min(240, Math.round(width * 0.7));

  const pageTranslateX = reducedMotion
    ? 0
    : drawerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, pageShift],
      });

  const pageScale = reducedMotion
    ? 1
    : drawerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.94],
      });

  const pageBorderRadius = reducedMotion
    ? 0
    : drawerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 20],
      });

  const pageShadowOpacity = reducedMotion
    ? 0
    : drawerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
      });

  const slideAnim = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  const backdropAnim = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.65],
  });

  const bottomInset = Math.max(insets.bottom, 12) + 8;

  const capsuleOpacity = reducedMotion
    ? isDrawerOpen
      ? 0
      : 1
    : drawerProgress.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [1, 0, 0],
      });
  const capsuleScale = scrollCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });
  const capsuleTranslateY = scrollCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4],
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#080808' : colors.background.secondary },
        webBackgroundStyle,
      ]}
    >
      {/* LeftDrawer Mobile (Padrão Owner) */}
      {isDrawerVisible && (
        <View
          pointerEvents={isDrawerOpen ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, styles.overlayContainer]}
          accessibilityViewIsModal={isDrawerOpen}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: '#000000',
                opacity: backdropAnim,
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel="Fechar menu lateral"
              onPress={closeDrawer}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.drawerPanel,
              {
                width: drawerWidth,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <LiquidGlassView
              variant="navigation"
              borderRadius={26}
              intensity={60}
              elevated={false}
              style={styles.drawerGlass}
              contentStyle={{
                height: '100%',
                paddingTop: Math.max(insets.top, spacing[4]),
                paddingBottom: Math.max(insets.bottom, spacing[4]),
              }}
            >
              <View
                style={[
                  styles.drawerHeader,
                  {
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border.subtle,
                    paddingHorizontal: spacing[5],
                    paddingBottom: spacing[4],
                    gap: spacing[3],
                  },
                ]}
              >
                <View style={styles.brandRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                    <BrandMark
                      variant={isDark ? 'symbol-ivory' : 'symbol-obsidian'}
                      size={32}
                      decorative={false}
                      accessibilityLabel="Smart Barber Logo"
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="subhead" weight="bold" color={colors.text.primary} numberOfLines={1}>
                        Smart Barber
                      </Text>
                      <Text variant="caption" color={colors.text.muted}>
                        Área do Cliente
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar menu lateral"
                    onPress={closeDrawer}
                    style={({ pressed }) => [
                      styles.closeButton,
                      {
                        borderRadius: radius.md,
                        backgroundColor: pressed
                          ? isDark
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(0, 0, 0, 0.08)'
                          : isDark
                            ? 'rgba(255, 255, 255, 0.05)'
                            : colors.surface.input,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border.default,
                      },
                    ]}
                  >
                    <Ionicons name="close-outline" size={22} color={colors.text.primary} />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.userCard,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.03)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
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
                    <Text
                      variant="caption"
                      color={colors.text.primary}
                      weight="bold"
                      style={{ lineHeight: 14, textAlign: 'center' }}
                    >
                      {initials}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0, gap: 3, justifyContent: 'center' }}>
                    <Text
                      variant="bodySm"
                      color={colors.text.primary}
                      weight="bold"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {userName}
                    </Text>
                    <Badge
                      label="Cliente"
                      tone="brand"
                      size="sm"
                    />
                  </View>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[3],
                  gap: spacing[4],
                }}
              >
                <View style={styles.menuGroup}>
                  <Text
                    variant="caption"
                    weight="bold"
                    color={colors.text.muted}
                    style={styles.groupTitle}
                  >
                    DESCOBERTA & AGENDA
                  </Text>

                  {PRIMARY_CLIENT_TABS.slice(0, 3).map((item) => (
                    <ClientSidebarItem
                      key={item.id}
                      label={item.label}
                      icon={item.iconInactive}
                      activeIcon={item.iconActive}
                      isActive={isRouteActive(pathname, item.route)}
                      onPress={() => handleNavigate(item.route)}
                    />
                  ))}
                </View>

                <View style={styles.menuGroup}>
                  <Text
                    variant="caption"
                    weight="bold"
                    color={colors.text.muted}
                    style={styles.groupTitle}
                  >
                    CONTA & SISTEMA
                  </Text>

                  {ACCOUNT_CLIENT_ITEMS.map((item) => (
                    <ClientSidebarItem
                      key={item.id}
                      label={item.label}
                      icon={item.iconInactive}
                      activeIcon={item.iconActive}
                      isActive={isRouteActive(pathname, item.route)}
                      onPress={() => handleNavigate(item.route)}
                    />
                  ))}

                  <ClientSidebarItem
                    label="Sair da Conta"
                    icon="log-out-outline"
                    activeIcon="log-out"
                    isActive={false}
                    destructive
                    onPress={handleSignOut}
                  />
                </View>
              </ScrollView>
            </LiquidGlassView>
          </Animated.View>
        </View>
      )}

      {/* Conteúdo Principal Deslocável */}
      <Animated.View
        style={[
          styles.mobilePageWrapper,
          {
            backgroundColor: colors.background.primary,
            transform: [{ translateX: pageTranslateX }, { scale: pageScale }],
            borderRadius: pageBorderRadius,
            shadowColor: '#000',
            shadowOffset: { width: -4, height: 8 },
            shadowOpacity: pageShadowOpacity,
            shadowRadius: 18,
            elevation: isDrawerOpen ? 16 : 0,
          },
          webBackgroundStyle,
        ]}
      >
        <View style={styles.pageInner}>{children}</View>

        {isDrawerOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar menu lateral e retornar ao conteúdo"
            onPress={closeDrawer}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </Animated.View>

      {/* BottomCapsuleBar Canônica (Padrão Owner com contentStyle horizontal e pílula Crimson) */}
      <Animated.View
        pointerEvents={isDrawerOpen ? 'none' : 'box-none'}
        style={[
          styles.outerCapsuleContainer,
          {
            bottom: bottomInset,
            paddingHorizontal: spacing[4],
            opacity: capsuleOpacity,
            transform: [{ scale: capsuleScale }, { translateY: capsuleTranslateY }],
          },
        ]}
      >
        <LiquidGlassView
          borderRadius={radius.full}
          intensity={60}
          elevated
          style={styles.capsuleWrapper}
          contentStyle={styles.capsuleContent}
        >
          <View
            accessibilityRole="tablist"
            accessibilityLabel="Navegação principal do cliente"
            style={styles.tablistContainer}
          >
            {PRIMARY_CLIENT_TABS.map((item) => {
              const isActive = isRouteActive(pathname, item.route);
              const iconName = isActive ? item.iconActive : item.iconInactive;
              const activeBg = colors.brand.primary;
              const activeTextColor = '#FFFFFF';
              const inactiveTextColor = colors.text.secondary;

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="tab"
                  accessibilityLabel={`${item.label}, ${isActive ? 'selecionado' : 'não selecionado'}`}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => handleNavigate(item.route)}
                  style={({ pressed }) => [
                    styles.tabItem,
                    {
                      opacity: pressed && !isActive ? 0.7 : 1,
                      backgroundColor: isActive ? activeBg : 'transparent',
                      borderRadius: radius.full,
                    },
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={20}
                    color={isActive ? activeTextColor : inactiveTextColor}
                  />
                  <Text
                    variant="caption"
                    weight={isActive ? 'bold' : 'medium'}
                    numberOfLines={1}
                    style={{
                      color: isActive ? activeTextColor : inactiveTextColor,
                      fontSize: isCompact && item.compactLabel ? 10 : 11,
                      lineHeight: isCompact && item.compactLabel ? 12 : 14,
                      marginTop: isCompact && item.compactLabel ? 1 : 2,
                      textAlign: 'center',
                    }}
                  >
                    {isCompact ? item.compactLabel ?? item.label : item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LiquidGlassView>
      </Animated.View>
    </View>
  );
}

interface ClientSidebarItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  destructive?: boolean;
  onPress: () => void;
}

function ClientSidebarItem({
  label,
  icon,
  activeIcon,
  isActive,
  destructive = false,
  onPress,
}: ClientSidebarItemProps) {
  const { colors, radius, spacing, isDark } = useTheme();

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

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          borderRadius: radius.md,
          backgroundColor: isActive
            ? colors.brand.primary
            : pressed
              ? isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.05)'
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

export function ClientNavigationShell({ children }: ClientNavigationShellProps) {
  return (
    <NavigationProvider>
      <ClientNavigationShellContent>{children}</ClientNavigationShellContent>
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  sidebarSlot: {
    width: 280,
    height: '100%',
    padding: 14,
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
  glassWrapper: {
    width: '100%',
    height: '100%',
  },
  glassContent: {
    width: '100%',
    height: '100%',
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
    width: 36,
    height: 36,
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
  desktopContent: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  mobilePageWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  pageInner: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    zIndex: 100,
    flexDirection: 'row',
  },
  drawerPanel: {
    height: '100%',
    padding: 12,
  },
  drawerGlass: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  drawerHeader: {
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCapsuleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    backgroundColor: 'transparent',
  },
  capsuleWrapper: {
    width: '100%',
    maxWidth: 380,
    height: 64,
    minHeight: 64,
  },
  capsuleContent: {
    width: '100%',
    height: 64,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tablistContainer: {
    flex: 1,
    height: 52,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    height: 50,
    minHeight: 48,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
});

