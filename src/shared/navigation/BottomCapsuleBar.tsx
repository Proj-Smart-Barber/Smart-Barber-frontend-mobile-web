import React from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAdaptiveLayout, useReducedMotion, useTheme } from '@/shared/theme';
import { useSession } from '@/features/auth';
import { Text } from '@/shared/ui';
import { LiquidGlassView } from './LiquidGlassView';
import { useNavigation } from './navigation-context';
import type { AppDestination } from './navigation.types';

interface DestinationConfig {
  id: AppDestination;
  label: string;
  compactLabel?: string;
  route: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  /** Quando definido, o destino só aparece para esse papel. */
  visibleForRole?: 'BARBER';
}

const DESTINATIONS: DestinationConfig[] = [
  {
    id: 'home',
    label: 'Início',
    route: '/(app)',
    iconActive: 'home',
    iconInactive: 'home-outline',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    route: '/(app)/agenda',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
  {
    id: 'availability',
    label: 'Horários',
    route: '/(app)/availability',
    iconActive: 'time',
    iconInactive: 'time-outline',
  },
];

export function BottomCapsuleBar() {
  const unitSession = useSession();
  const canManageBookings = unitSession.memberships.some(m => m.id === unitSession.selectedShopId &&
    m.state === 'ACTIVE' && ['OWNER', 'BARBERMAN'].includes(m.role));
  const { colors, spacing, radius, isDark } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const { isOwner } = useSession();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeDestination, isDrawerOpen, drawerProgress, scrollCollapseProgress } = useNavigation();
  const reducedMotion = useReducedMotion();

  const visibleDestinations = DESTINATIONS.filter(
    (item) => item.visibleForRole !== 'BARBER' || canManageBookings,
  );

  const handleNavigate = (route: string, currentId: AppDestination) => {
    if (activeDestination === currentId) return;
    router.push(route as any);
  };

  const bottomInset = Math.max(insets.bottom, 12) + 8;

  // Atenua e desabilita a barra durante o drawer aberto
  const capsuleOpacity = reducedMotion
    ? (isDrawerOpen ? 0 : 1)
    : drawerProgress.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [1, 0, 0],
      });
  const capsuleScale = scrollCollapseProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const capsuleTranslateY = scrollCollapseProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

  return (
    <Animated.View
      pointerEvents={isDrawerOpen ? 'none' : 'box-none'}
      style={[
        styles.outerContainer,
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
          accessibilityLabel="Navegação principal da aplicação"
          style={styles.tablistContainer}
        >
          {visibleDestinations.map((item) => {
            const isActive = activeDestination === item.id;
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
                onPress={() => handleNavigate(item.route, item.id)}
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
  );
}

const styles = StyleSheet.create({
  outerContainer: {
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
