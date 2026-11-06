import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import {
  ExploreFeedView,
  ClientExploreTabs,
  ClientNearbyView,
  resolveClientExploreSection,
  useOptionalClientExperienceContext,
  type ClientExploreSection,
} from '@/features/discovery';

/**
 * Tela Explorar do Cliente
 * Integra os acessos superiores Explorar | Perto de você | Meus agendamentos,
 * preserva a instância do feed após a primeira abertura, pausa mídia/toques/paginação
 * quando oculto e publica a mídia efetivamente visível para a ação Agendar.
 */
export default function ClientExploreScreen() {
  const { colors } = useTheme();
  const { isCompact } = useAdaptiveLayout();
  const insets = useAppSafeArea();
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const clientExperience = useOptionalClientExperienceContext();

  const activeSection = resolveClientExploreSection(params?.section);
  const [hasVisitedFeed, setHasVisitedFeed] = useState<boolean>(
    () => activeSection === 'feed',
  );
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (activeSection === 'feed') {
      setHasVisitedFeed(true);
    }
  }, [activeSection]);

  const publishActiveMedia = clientExperience?.publishActiveMedia;

  useEffect(() => {
    if (activeSection !== 'feed') {
      publishActiveMedia?.(null);
    }
  }, [activeSection, publishActiveMedia]);

  const handleSelectSection = useCallback(
    (next: ClientExploreSection) => {
      if (next === activeSection) {
        return;
      }

      if (next === 'bookings') {
        publishActiveMedia?.(null);
        router.push('/(client)/bookings' as any);
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

  const topSafePadding = insets.top > 0 ? insets.top + 8 : 16;
  const feedTopOffset =
    headerHeight > 0 ? headerHeight + 8 : topSafePadding + 56;

  return (
    <View
      style={[
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
          activeSection === 'feed'
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
        </View>
      </View>

      {/* Instância do Feed preservada após a primeira abertura */}
      {hasVisitedFeed && (
        <View
          style={[
            styles.feedLayer,
            activeSection !== 'feed' && styles.hiddenFeedLayer,
          ]}
          pointerEvents={activeSection === 'feed' ? 'auto' : 'none'}
          aria-hidden={activeSection !== 'feed'}
          accessibilityElementsHidden={activeSection !== 'feed'}
          importantForAccessibility={
            activeSection === 'feed' ? 'auto' : 'no-hide-descendants'
          }
        >
          <ExploreFeedView
            initialRadius={10}
            isVisible={activeSection === 'feed'}
            topOffset={feedTopOffset}
            onActiveMediaChange={publishActiveMedia}
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
            initialRadius={10}
          />
        </View>
      )}
    </View>
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
  nearbyHeaderBlock: {
    paddingBottom: 8,
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
