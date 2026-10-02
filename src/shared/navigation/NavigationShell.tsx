import React from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAdaptiveLayout, useReducedMotion, useTheme } from '@/shared/theme';
import { BottomCapsuleBar } from './BottomCapsuleBar';
import { DesktopSidebar } from './DesktopSidebar';
import { LeftDrawer } from './LeftDrawer';
import { NavigationProvider, useNavigation } from './navigation-context';

export interface NavigationShellProps {
  children: React.ReactNode;
}

function NavigationShellContent({ children }: NavigationShellProps) {
  const { colors, radius, isDark } = useTheme();
  const { isExpanded } = useAdaptiveLayout();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { isDrawerOpen, openDrawer, closeDrawer, activeDestination, drawerProgress } = useNavigation();

  // No desktop / tablet expandido: sidebar persistente à esquerda + conteúdo à direita
  if (isExpanded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary, flexDirection: 'row' }]}>
        <DesktopSidebar />
        <View style={styles.desktopContent}>{children}</View>
      </View>
    );
  }

  // Deslocamento da página para a direita durante a abertura do Drawer (como na referência Threads)
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

  // Exibe disparador flutuante de menu nas outras telas que não têm hamburger nativo no header
  const showFloatingMenuTrigger = activeDestination !== 'home' && !isDrawerOpen;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#080808' : colors.background.secondary }]}>
      {/* Drawer Lateral Esquerdo (renderizado sob ou sobre a página deslocada) */}
      <LeftDrawer />

      {/* Conteúdo da página móvel deslocável (deslocamento Threads) */}
      <Animated.View
        style={[
          styles.mobilePageWrapper,
          {
            backgroundColor: colors.background.primary,
            transform: [
              { translateX: pageTranslateX },
              { scale: pageScale },
            ],
            borderRadius: pageBorderRadius,
            shadowColor: '#000',
            shadowOffset: { width: -4, height: 8 },
            shadowOpacity: pageShadowOpacity,
            shadowRadius: 18,
            elevation: isDrawerOpen ? 16 : 0,
          },
        ]}
      >
        <View style={styles.pageInner}>{children}</View>

        {/* Camada que intercepta toque para fechar o drawer quando a página estiver deslocada */}
        {isDrawerOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar menu lateral e retornar ao conteúdo"
            onPress={closeDrawer}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </Animated.View>

      {/* Cápsula Inferior Flutuante Mobile (renderizada sem faixa opaca de corte) */}
      <BottomCapsuleBar />

      {/* Disparador do Menu Lateral para telas secundárias */}
      {showFloatingMenuTrigger ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.floatingTriggerContainer,
            {
              bottom: Math.max(insets.bottom, 10) + 76,
              right: 16,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menu de serviços e catálogo"
            onPress={openDrawer}
            style={({ pressed }) => [
              styles.floatingTriggerButton,
              {
                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : colors.border.default,
                borderRadius: radius.full,
                opacity: pressed ? 0.8 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              },
            ]}
          >
            <Ionicons name="grid-outline" size={20} color={colors.text.primary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function NavigationShell({ children }: NavigationShellProps) {
  return (
    <NavigationProvider>
      <NavigationShellContent>{children}</NavigationShellContent>
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
  floatingTriggerContainer: {
    position: 'absolute',
    zIndex: 85,
  },
  floatingTriggerButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
