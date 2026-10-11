import React from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReducedMotion, useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui';
import { LiquidGlassView } from './LiquidGlassView';
import { useNavigation } from './navigation-context';
import type { AppDestination } from './navigation.types';

interface DestinationConfig {
  id: AppDestination;
  label: string;
  route: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
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
  const { colors, spacing, radius, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeDestination, isDrawerOpen, drawerProgress } = useNavigation();
  const reducedMotion = useReducedMotion();

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

  return (
    <Animated.View
      pointerEvents={isDrawerOpen ? 'none' : 'box-none'}
      style={[
        styles.outerContainer,
        {
          bottom: bottomInset,
          paddingHorizontal: spacing[4],
          opacity: capsuleOpacity,
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
          {DESTINATIONS.map((item) => {
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
                  style={{
                    color: isActive ? activeTextColor : inactiveTextColor,
                    fontSize: 11,
                    lineHeight: 14,
                    marginTop: 2,
                    textAlign: 'center',
                  }}
                >
                  {item.label}
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
