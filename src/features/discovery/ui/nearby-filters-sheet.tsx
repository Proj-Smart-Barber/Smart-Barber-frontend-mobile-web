import { usePresenceTransition } from '@/shared/ui/use-presence-transition';
import { useReducedMotion, motion } from '@/shared/theme';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useAdaptiveLayout } from '@/shared/theme';
import { useAppSafeArea } from '@/shared/theme/use-app-safe-area';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import {
  type NearbyFilterSelection,
  normalizeNearbyFilterSelection,
  VALID_DISCOVERY_RADII,
} from '../model/nearby-filter-selection';
import {
  LocationStatusPanel,
  type LocationPanelStatus,
} from './location-status-panel';

export interface NearbyFiltersSheetProps {
  visible: boolean;
  value: NearbyFilterSelection;
  isLocationAvailable: boolean;
  locationStatus: LocationPanelStatus;
  canAskAgain: boolean;
  scopeKey?: string;
  onClose: () => void;
  onApply: (value: NearbyFilterSelection) => void;
  onRecoverPermission: () => void | Promise<void>;
  onRetryPosition: () => void | Promise<void>;
  onManualSearch: () => void;
}

export function NearbyFiltersSheet({
  visible,
  value,
  isLocationAvailable,
  locationStatus,
  canAskAgain,
  scopeKey,
  onClose,
  onApply,
  onRecoverPermission,
  onRetryPosition,
  onManualSearch,
}: NearbyFiltersSheetProps) {
  const reducedMotion = useReducedMotion();
  const presence = usePresenceTransition(visible, {
    enterDuration: motion.slow,
    exitDuration: motion.standard,
    reducedMotion,
    scopeKey,
    onExited: () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && typeof activeEl.blur === 'function' && activeEl !== document.body) {
          activeEl.blur();
        }
      }
    },
  });
  const { colors, spacing, radius, isDark } = useTheme();
  const { isExpanded } = useAdaptiveLayout();
  const insets = useAppSafeArea();

  // Rascunho estritamente local; inicializa ao abrir
  const [draft, setDraft] = useState<NearbyFilterSelection>(() =>
    normalizeNearbyFilterSelection(value),
  );

  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setDraft(normalizeNearbyFilterSelection(value));
    }
    wasVisible.current = visible;
  }, [visible, value]);

  // Tecla Escape no ambiente Web
  useEffect(() => {
    if (!visible || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const handleSelectMode = (mode: NearbyFilterSelection['mode']) => {
    setDraft((prev) => ({ ...prev, mode }));
  };

  const handleSelectRadius = (radiusKm: NearbyFilterSelection['radiusKm']) => {
    setDraft({ mode: 'NEARBY', radiusKm });
  };

  const handleResetDraft = () => {
    // Limpar define apenas o rascunho para ALL e 10 km (sem aplicar nem disparar requests)
    setDraft({ mode: 'ALL', radiusKm: 10 });
  };

  const handleApply = () => {
    onApply(normalizeNearbyFilterSelection(draft));
    onClose();
  };

  if (!presence.mounted) return null;

  return (
    <Modal
      visible={presence.mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      accessibilityViewIsModal
      testID="nearby-filters-modal"
    >
      <Animated.View
        style={[
          { opacity: presence.progress },
          styles.overlay,
          isExpanded ? styles.overlayDesktop : styles.overlayMobile,
        ]}
      >
        {/* Backdrop para fechar descartando rascunho */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar filtros"
        />

        <Animated.View
          style={[
            { transform: [{ translateY: presence.progress.interpolate({ inputRange: [0, 1], outputRange: [reducedMotion ? 0 : 24, 0] }) }] },
            styles.sheetContainer,
            isExpanded ? styles.sheetDesktop : styles.sheetMobile,
            {
              backgroundColor: isDark ? '#141416' : colors.surface.elevated,
              borderColor: colors.border.subtle,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          accessibilityRole="dialog"
          aria-modal={true}
        >
          {/* Header da Gaveta / Modal */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="subhead" weight="bold" color={colors.text.primary}>
                Filtros de distância
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar filtros"
              hitSlop={8}
              style={[
                styles.closeButton,
                {
                  borderRadius: radius.full,
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Corpo rolável */}
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Seleção de Raio (ativo quando modo é NEARBY ou elegível) */}
            <View style={[styles.section, { marginTop: spacing[4] }]}>
              <Text
                variant="bodySm"
                weight="semibold"
                color={colors.text.secondary}
                style={{ marginBottom: spacing[2] }}
              >
                Raio de busca
              </Text>

              <View style={styles.radiusPillsRow}>
            <Pressable onPress={() => handleSelectMode('ALL')} accessibilityRole="button" accessibilityLabel="Sem limite de distância" accessibilityState={{ selected: draft.mode === 'ALL' }} aria-selected={draft.mode === 'ALL'} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text color={draft.mode === 'ALL' ? colors.brand.primary : colors.text.primary}>Sem limite</Text>
            </Pressable>

                {VALID_DISCOVERY_RADII.map((radiusOpt) => {
                  const isSelected =
                    draft.mode === 'NEARBY' && draft.radiusKm === radiusOpt;
                  return (
                    <Pressable
                      key={radiusOpt}
                      onPress={() => handleSelectRadius(radiusOpt)}
                      accessibilityRole="button"
                      accessibilityLabel={`Raio de ${radiusOpt} quilômetros`}
                      accessibilityState={{ selected: isSelected }}
                      aria-selected={isSelected}
                      style={[
                        styles.radiusPill,
                        {
                          borderRadius: radius.md,
                          borderColor: isSelected
                            ? colors.brand.primary
                            : colors.border.subtle,
                          backgroundColor: isSelected
                            ? colors.brand.primary
                            : colors.surface.input,
                        },
                      ]}
                    >
                      <Text
                        variant="bodySm"
                        weight={isSelected ? 'bold' : 'medium'}
                        color={isSelected ? '#FFFFFF' : colors.text.primary}
                      >
                        {`${radiusOpt} km`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Aviso de Localização / Recuperação quando status não for 'ready' */}
            {locationStatus !== 'ready' && (
              <View style={{ marginTop: spacing[4] }}>
                <LocationStatusPanel
                  status={locationStatus}
                  canAskAgain={canAskAgain}
                  onRecoverPermission={onRecoverPermission}
                  onRetryPosition={onRetryPosition}
                  onManualSearch={() => {
                    handleResetDraft();
                    onManualSearch();
                    onClose();
                  }}
                />
              </View>
            )}
          </ScrollView>

          {/* Rodapé com Ações: Limpar e Aplicar */}
          <View
            style={[
              styles.sheetFooter,
              {
                borderTopColor: colors.border.subtle,
                paddingTop: spacing[3],
                marginTop: spacing[2],
              },
            ]}
          >
            <Button
              variant="outline"
              title="Limpar filtros"
              accessibilityLabel="Limpar filtros"
              onPress={handleResetDraft}
              style={{ flex: 1, minHeight: 44 }}
            />
            <View style={{ width: spacing[3] }} />
            <Button
              variant="primary"
              title="Aplicar filtros"
            disabled={draft.mode === 'NEARBY' && !isLocationAvailable}
              accessibilityLabel="Aplicar filtros"
              onPress={handleApply}
              style={{ flex: 1, minHeight: 44 }}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMobile: {
    justifyContent: 'flex-end',
  },
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheetContainer: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetMobile: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetDesktop: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    flexGrow: 0,
  },
  sheetBodyContent: {
    paddingVertical: 8,
  },
  section: {
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    minHeight: 48,
  },
  radiusPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
