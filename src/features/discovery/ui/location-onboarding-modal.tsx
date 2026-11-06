import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Platform,
  BackHandler,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Text } from '@/shared/ui/Text';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { BrandMark } from '@/shared/brand';
import { LiquidGlassView } from '@/shared/navigation/LiquidGlassView';
import type { LocationOnboardingStage } from '../model/use-client-location-onboarding';

export interface LocationOnboardingModalProps {
  visible: boolean;
  onContinue: () => void | Promise<void>;
  onClose: () => void;
  stage?: LocationOnboardingStage;
  requestPhase?: 'permission' | 'position' | null;
  isPositionSlow?: boolean;
}

export function LocationOnboardingModal({
  visible,
  onContinue,
  onClose,
  stage = 'intro',
  requestPhase = null,
  isPositionSlow = false,
}: LocationOnboardingModalProps) {
  const { colors, radius, spacing, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const continueButtonRef = useRef<any>(null);

  // Escuta tecla Escape na Web e BackHandler no Android
  useEffect(() => {
    if (!visible) return;

    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      return () => sub.remove();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const isRequesting = stage === 'requesting';
  const modalMaxWidth = Math.min(width - 32, 420);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.modalOverlay}>
        {/* Fundo inerte com ação acessível de fechamento */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar explicação de localização"
        />

        <View
          style={[
            styles.cardWrapper,
            {
              width: modalMaxWidth,
              maxWidth: 420,
              backgroundColor: isDark ? '#141416' : colors.surface.elevated,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border.subtle,
              borderRadius: radius.xl,
            },
          ]}
          accessibilityRole="alertdialog"
          accessibilityLabel="Permissão de localização para encontrar barbearias"
        >
          <LiquidGlassView
            variant="card"
            borderRadius={radius.xl}
            style={styles.liquidGlass}
            contentStyle={[styles.cardContent, { padding: spacing[5] }]}
          >
            {/* Header: Marca e botão de fechamento */}
            <View style={styles.headerRow}>
              <View style={styles.brandIconContainer}>
                <BrandMark
                  variant={isDark ? 'symbol-crimson' : 'symbol-obsidian'}
                  size={36}
                  decorative
                />
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fechar janela explicativa"
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    borderRadius: radius.full,
                    backgroundColor: pressed
                      ? isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.06)'
                      : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={isDark ? colors.text.secondary : colors.text.primary}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {isRequesting ? (
                /* Estado transitório durante a solicitação */
                <View style={styles.loadingContainer}>
                  <Spinner size="large" />

                  <View style={styles.loadingTextGroup}>
                    <Text
                      variant="h3"
                      weight="bold"
                      color={colors.text.primary}
                      style={styles.textCenter}
                    >
                      {requestPhase === 'permission'
                        ? 'Aguardando sua escolha'
                        : 'Obtendo sua localização…'}
                    </Text>

                    <Text
                      variant="bodySm"
                      color={colors.text.secondary}
                      style={[styles.textCenter, { marginTop: spacing[2] }]}
                    >
                      {requestPhase === 'permission'
                        ? 'Confirme a permissão na janela do sistema ou navegador.'
                        : 'Consultando o sensor de localização do dispositivo.'}
                    </Text>

                    {isPositionSlow ? (
                      <View
                        style={[
                          styles.slowNoticeBox,
                          {
                            backgroundColor: isDark
                              ? 'rgba(224, 86, 36, 0.12)'
                              : 'rgba(224, 86, 36, 0.08)',
                            borderColor: colors.feedback?.warning ?? '#F59E0B',
                            borderRadius: radius.md,
                            marginTop: spacing[3],
                            padding: spacing[3],
                          },
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color={colors.feedback?.warning ?? '#F59E0B'}
                        />
                        <Text
                          variant="caption"
                          color={colors.feedback?.warning ?? '#F59E0B'}
                          style={{ flex: 1 }}
                        >
                          Esta operação está demorando mais que o esperado.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : (
                /* Conteúdo Obrigatório do Modal */
                <View style={styles.bodyContainer}>
                  <Text
                    variant="h3"
                    weight="bold"
                    color={colors.text.primary}
                    style={styles.title}
                  >
                    Encontre barbearias perto de você
                  </Text>

                  <Text
                    variant="bodySm"
                    color={colors.text.secondary}
                    style={[styles.description, { marginTop: spacing[2] }]}
                  >
                    Usamos sua localização para mostrar as barbearias mais próximas.
                  </Text>

                  {/* Caixa de Aviso Obrigatória */}
                  <View
                    style={[
                      styles.alertBox,
                      {
                        backgroundColor: isDark
                          ? 'rgba(189, 32, 38, 0.1)'
                          : 'rgba(189, 32, 38, 0.06)',
                        borderColor: isDark
                          ? 'rgba(189, 32, 38, 0.3)'
                          : 'rgba(189, 32, 38, 0.2)',
                        borderRadius: radius.md,
                        marginTop: spacing[4],
                        padding: spacing[3],
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={colors.brand.primary}
                      style={{ marginTop: 2 }}
                    />
                    <Text
                      variant="bodySm"
                      weight="medium"
                      color={isDark ? '#ff9b9e' : colors.brand.primary}
                      style={{ flex: 1 }}
                    >
                      Sem essa permissão, não conseguimos identificar as barbearias mais próximas de você.
                    </Text>
                  </View>

                  {/* Complemento Obrigatório */}
                  <Text
                    variant="caption"
                    color={colors.text.muted}
                    style={[styles.complement, { marginTop: spacing[3] }]}
                  >
                    Você ainda pode explorar e buscar por nome ou bairro.
                  </Text>

                  {/* Botão de Ação Obrigatório */}
                  <View style={[styles.actionWrapper, { marginTop: spacing[5] }]}>
                    <Button
                      variant="primary"
                      title="Continuar"
                      onPress={onContinue}
                      style={styles.continueButton}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </LiquidGlassView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  cardWrapper: {
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  liquidGlass: {
    width: '100%',
  },
  cardContent: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 4,
  },
  bodyContainer: {
    width: '100%',
  },
  title: {
    lineHeight: 28,
  },
  description: {
    lineHeight: 20,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
  },
  complement: {
    lineHeight: 18,
  },
  actionWrapper: {
    width: '100%',
  },
  continueButton: {
    width: '100%',
    minHeight: 48,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  loadingTextGroup: {
    alignItems: 'center',
    width: '100%',
  },
  textCenter: {
    textAlign: 'center',
  },
  slowNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    width: '100%',
  },
});

