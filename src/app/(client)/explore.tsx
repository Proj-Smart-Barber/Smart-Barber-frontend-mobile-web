import { useScreenTransition } from '@/shared/ui/use-screen-transition';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Animated,
  AppState,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import * as ExpoRouter from 'expo-router';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import {
  ExploreFeedView,
  ClientExploreTabs,
  ClientNearbyView,
  resolveClientExploreSection,
  useOptionalClientExperienceContext,
  type ClientExploreSection,
  type ExploreFeedHandle,
} from '@/features/discovery';

function useSafeRouteFocus(pathname: string): boolean {
  let routerFocused = true;
  try {
    const maybeUseIsFocused = (ExpoRouter as any).useIsFocused;
    if (typeof maybeUseIsFocused === 'function') {
      routerFocused = Boolean(maybeUseIsFocused());
    }
  } catch {
    routerFocused = true;
  }
  const matchesExplorePath =
    !pathname ||
    pathname === '/(client)/explore' ||
    pathname === '/explore' ||
    pathname.startsWith('/(client)/explore/') ||
    pathname.startsWith('/explore/');
  return routerFocused && matchesExplorePath;
}

function useDocumentAndAppActive(): boolean {
  const [isActive, setIsActive] = useState<boolean>(() => {
    if (
      Platform.OS === 'web' &&
      typeof document !== 'undefined' &&
      typeof document.visibilityState === 'string'
    ) {
      return document.visibilityState !== 'hidden';
    }
    return true;
  });

  useEffect(() => {
    const syncVisibility = () => {
      if (
        Platform.OS === 'web' &&
        typeof document !== 'undefined' &&
        typeof document.visibilityState === 'string'
      ) {
        setIsActive(document.visibilityState !== 'hidden');
        return;
      }
      setIsActive(AppState.currentState ? AppState.currentState === 'active' : true);
    };

    let removeWebListeners: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onPageShow = () => setIsActive(true);
      const onPageHide = () => setIsActive(false);
      window.addEventListener('pageshow', onPageShow);
      window.addEventListener('pagehide', onPageHide);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', syncVisibility);
      }
      removeWebListeners = () => {
        window.removeEventListener('pageshow', onPageShow);
        window.removeEventListener('pagehide', onPageHide);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', syncVisibility);
        }
      };
    }

    const appStateSub =
      typeof AppState?.addEventListener === 'function'
        ? AppState.addEventListener('change', (nextState) => {
            setIsActive(nextState === 'active');
          })
        : null;

    return () => {
      removeWebListeners?.();
      appStateSub?.remove?.();
    };
  }, []);

  return isActive;
}

/**
 * Tela Explorar do Cliente
 * Integra os acessos superiores Explorar | Perto de você | Meus agendamentos,
 * preserva a instância do feed após a primeira abertura, pausa mídia/toques/paginação
 * quando oculto ou sem foco de rota e publica a mídia efetivamente visível para a ação Agendar.
 */
export default function ClientExploreScreen() {
  const { colors } = useTheme();
  const { isCompact, isExpanded } = useAdaptiveLayout();
  const isDesktopVariant = Platform.OS === 'web' && isExpanded;
  const insets = useAppSafeArea();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const clientExperience = useOptionalClientExperienceContext();

  const isRouteFocused = useSafeRouteFocus(pathname);
  const isDocumentActive = useDocumentAndAppActive();
  const activeSection = resolveClientExploreSection(params?.section);
  const isFeedEffectiveVisible =
    activeSection === 'feed' && isRouteFocused && isDocumentActive;

  const sectionOpacity = useScreenTransition(activeSection);
  const [hasVisitedFeed, setHasVisitedFeed] = useState<boolean>(
    () => activeSection === 'feed',
  );
  const [headerHeight, setHeaderHeight] = useState(0);
  const feedRef = useRef<ExploreFeedHandle>(null);

  useEffect(() => {
    if (activeSection === 'feed') {
      setHasVisitedFeed(true);
    }
  }, [activeSection]);

  const publishActiveMedia = clientExperience?.publishActiveMedia;

  useEffect(() => {
    if (!isFeedEffectiveVisible) {
      publishActiveMedia?.(null);
    }
  }, [isFeedEffectiveVisible, publishActiveMedia]);

  const handleSelectSection = useCallback(
    (next: ClientExploreSection) => {
      if (next === activeSection) {
        return;
      }

      if (next === 'nearby') {
        publishActiveMedia?.(null);
        if (typeof router.setParams === 'function') {
          router.setParams({ section: 'nearby' } as any);
        } else {
          router.replace('/(client)/explore?section=nearby' as any);
        }
        return;
      }

      setHasVisitedFeed(true);
      if (typeof router.setParams === 'function') {
        router.setParams({ section: 'feed' } as any);
      } else {
        router.replace('/(client)/explore' as any);
      }
    },
    [activeSection, publishActiveMedia, router],
  );

  const topSafePadding = insets.top > 0 ? insets.top + 10 : 16;
  const feedTopOffset =
    headerHeight > 0 ? headerHeight + 8 : topSafePadding + 56;

  return (
    <Animated.View
      style={[
        { opacity: sectionOpacity },
        styles.screenContainer,
        {
          backgroundColor:
            activeSection === 'feed' ? '#0a0a0a' : colors.background.primary,
        },
      ]}
    >
      {/* Cabeçalho de Acessos Superiores: Explorar | Perto de você | Meus agendamentos */}
      <View
        onLayout={(e) => {
          const measured = e.nativeEvent.layout.height;
          if (measured > 0 && Math.abs(measured - headerHeight) > 1) {
            setHeaderHeight(measured);
          }
        }}
        style={[
          styles.topHeaderContainer,
          isDesktopVariant
            ? styles.desktopHeaderBlock
            : activeSection === 'feed'
              ? styles.feedHeaderOverlay
              : styles.nearbyHeaderBlock,
          {
            paddingTop: topSafePadding,
            paddingHorizontal: isCompact ? 16 : 32,
          },
        ]}
      >
        <View style={styles.headerConstraint}>
          <ClientExploreTabs
            active={activeSection}
            onSelect={handleSelectSection}
          />
          {activeSection === 'feed' && (
            <View style={styles.filterBarRow}>
              <Pressable
                onPress={() => feedRef.current?.openFilters()}
                style={({ pressed }) => [
                  styles.filterButton,
                  pressed && styles.filterButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Abrir filtros de busca e raio"
              >
                <Ionicons name="options-outline" size={16} color="#ffffff" />
                <Text style={styles.filterButtonLabel}>Filtros</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Instância do Feed preservada após a primeira abertura */}
      {hasVisitedFeed && (
        <View
          style={[
            styles.feedLayer,
            activeSection !== 'feed' && styles.hiddenFeedLayer,
          ]}
          pointerEvents={isFeedEffectiveVisible ? 'auto' : 'none'}
          aria-hidden={!isFeedEffectiveVisible}
          accessibilityElementsHidden={!isFeedEffectiveVisible}
          importantForAccessibility={
            isFeedEffectiveVisible ? 'auto' : 'no-hide-descendants'
          }
        >
          <ExploreFeedView
            ref={feedRef}
            isVisible={isFeedEffectiveVisible}
            topOffset={isDesktopVariant ? 0 : feedTopOffset}
            onActiveMediaChange={publishActiveMedia}
            presentation={isDesktopVariant ? 'desktop' : 'immersive'}
            onRequestBooking={clientExperience?.requestBooking}
            interactionBlocked={Boolean(clientExperience?.bookingStart)}
          />
        </View>
      )}

      {/* Seção Perto de você */}
      {activeSection === 'nearby' && (
        <View style={styles.nearbyLayer}>
          <ClientNearbyView
            onboardingStage={clientExperience?.locationOnboarding?.stage}
            canAskAgain={clientExperience?.locationOnboarding?.canAskAgain}
            onRecoverPermission={
              clientExperience?.locationOnboarding?.recoverPermission
            }
            onRetryPosition={
              clientExperience?.locationOnboarding?.retryPosition
            }
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    position: 'relative',
  },
  topHeaderContainer: {
    width: '100%',
    zIndex: 40,
  },
  feedHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 6,
  },
  desktopHeaderBlock: {
    paddingBottom: 8,
  },
  nearbyHeaderBlock: {
    paddingBottom: 8,
  },
  filterBarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    minWidth: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(25, 25, 28, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  filterButtonPressed: {
    backgroundColor: 'rgba(45, 45, 52, 0.85)',
  },
  filterButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerConstraint: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },
  feedLayer: {
    flex: 1,
  },
  hiddenFeedLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: -1,
  },
  nearbyLayer: {
    flex: 1,
  },
});
