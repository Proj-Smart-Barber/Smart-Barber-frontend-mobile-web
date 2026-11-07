import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/theme';
import { Spinner } from '@/shared/ui/Spinner';

export interface DesktopShopControlsProps {
  currentIndex: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  isLoadingNextPage?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  direction?: 'vertical' | 'horizontal';
  disabled?: boolean;
}

/**
 * Trilho / Linha de controles de navegação entre Barbearias (Unidades).
 * Respeita área de toque mínima de 44x44, foco e acessibilidade.
 */
export function DesktopShopControls({
  currentIndex,
  totalCount,
  hasPrevious,
  hasNext,
  isLoadingNextPage = false,
  onPrevious,
  onNext,
  direction = 'vertical',
  disabled = false,
}: DesktopShopControlsProps) {
  const isHorizontal = direction === 'horizontal';

  const canGoPrevious = !disabled && hasPrevious;
  const canGoNext = !disabled && hasNext && !isLoadingNextPage;

  return (
    <View
      style={[
        styles.shopControlsContainer,
        isHorizontal ? styles.shopControlsRow : styles.shopControlsColumn,
      ]}
      testID="desktop-shop-controls"
    >
      {/* Botão Anterior */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Barbearia anterior"
        aria-disabled={!canGoPrevious}
        disabled={!canGoPrevious}
        onPress={canGoPrevious ? onPrevious : undefined}
        style={({ pressed }) => [
          styles.controlButton,
          !canGoPrevious && styles.controlButtonDisabled,
          pressed && canGoPrevious && styles.controlButtonPressed,
        ]}
      >
        <Ionicons
          name={isHorizontal ? 'chevron-back' : 'chevron-up'}
          size={20}
          color={canGoPrevious ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'}
        />
      </Pressable>

      {/* Indicador de Unidade ou Loading de Próxima Página */}
      <View style={styles.shopIndicatorContainer}>
        {isLoadingNextPage ? (
          <View
            accessibilityRole="status"
            accessibilityLabel="Carregando mais barbearias…"
            style={styles.spinnerWrapper}
          >
            <Spinner size="small" />
          </View>
        ) : (
          <View style={styles.shopBadge}>
            <Ionicons name="storefront-outline" size={14} color="#94a3b8" />
          </View>
        )}
      </View>

      {/* Botão Próximo */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próxima barbearia"
        aria-disabled={!canGoNext}
        disabled={!canGoNext}
        onPress={canGoNext ? onNext : undefined}
        style={({ pressed }) => [
          styles.controlButton,
          !canGoNext && styles.controlButtonDisabled,
          pressed && canGoNext && styles.controlButtonPressed,
        ]}
      >
        <Ionicons
          name={isHorizontal ? 'chevron-forward' : 'chevron-down'}
          size={20}
          color={canGoNext ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'}
        />
      </Pressable>
    </View>
  );
}

export interface DesktopMediaControlsProps {
  currentIndex: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  disabled?: boolean;
}

/**
 * Controles de mídia (foto / vídeo) logo abaixo do palco.
 * Área de toque de pelo menos 44x44, contador explícito e setas direcionais.
 */
export function DesktopMediaControls({
  currentIndex,
  totalCount,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  disabled = false,
}: DesktopMediaControlsProps) {
  const canGoPrevious = !disabled && hasPrevious;
  const canGoNext = !disabled && hasNext;

  const displayCount = Math.max(1, totalCount);
  const displayCurrent = Math.min(displayCount, currentIndex + 1);

  return (
    <View style={styles.mediaControlsBar} testID="desktop-media-controls">
      {/* Botão Foto Anterior */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mídia anterior"
        aria-disabled={!canGoPrevious}
        disabled={!canGoPrevious}
        onPress={canGoPrevious ? onPrevious : undefined}
        style={({ pressed }) => [
          styles.mediaButton,
          !canGoPrevious && styles.mediaButtonDisabled,
          pressed && canGoPrevious && styles.mediaButtonPressed,
        ]}
      >
        <Ionicons
          name="chevron-back"
          size={18}
          color={canGoPrevious ? '#ffffff' : 'rgba(255, 255, 255, 0.25)'}
        />
      </Pressable>

      {/* Indicador de Mídia (ex: 2 de 5) */}
      <View style={styles.mediaCounterBadge}>
        <Text style={styles.mediaCounterText}>
          {`${displayCurrent} de ${displayCount}`}
        </Text>
      </View>

      {/* Botão Próxima Foto */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próxima mídia"
        aria-disabled={!canGoNext}
        disabled={!canGoNext}
        onPress={canGoNext ? onNext : undefined}
        style={({ pressed }) => [
          styles.mediaButton,
          !canGoNext && styles.mediaButtonDisabled,
          pressed && canGoNext && styles.mediaButtonPressed,
        ]}
      >
        <Ionicons
          name="chevron-forward"
          size={18}
          color={canGoNext ? '#ffffff' : 'rgba(255, 255, 255, 0.25)'}
        />
      </Pressable>
    </View>
  );
}

export interface DesktopExploreKeyboardContainerProps {
  children: React.ReactNode;
  onPreviousShop: () => void;
  onNextShop: () => void;
  onPreviousMedia: () => void;
  onNextMedia: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Container local com suporte a navegação por teclado.
 * Não adiciona listeners globais na janela; responde apenas quando o foco estiver
 * contido no feed e não intercepta formulários, inputs ou controles nativos de vídeo.
 */
export function DesktopExploreKeyboardContainer({
  children,
  onPreviousShop,
  onNextShop,
  onPreviousMedia,
  onNextMedia,
  disabled = false,
  style,
}: DesktopExploreKeyboardContainerProps) {
  const handleKeyDown = (e: any) => {
    if (disabled) return;

    const target = e.target as HTMLElement | null;
    if (target) {
      const tagName = target.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
        return; // Preserva digitação do usuário em inputs
      }
      if (tagName === 'video' || tagName === 'audio') {
        return; // Preserva controles de reprodução de mídia
      }
    }

    if (e.defaultPrevented) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault?.();
        onPreviousShop();
        break;
      case 'ArrowDown':
        e.preventDefault?.();
        onNextShop();
        break;
      case 'ArrowLeft':
        e.preventDefault?.();
        onPreviousMedia();
        break;
      case 'ArrowRight':
        e.preventDefault?.();
        onNextMedia();
        break;
    }
  };

  return (
    <View
      style={[{ flex: 1 }, style]}
      testID="desktop-keyboard-nav-container"
      {...({ tabIndex: 0, onKeyDown: handleKeyDown } as any)}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shopControlsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopControlsColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  shopControlsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(28, 28, 32, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  controlButtonDisabled: {
    opacity: 0.4,
    cursor: 'default',
  },
  controlButtonPressed: {
    backgroundColor: 'rgba(50, 50, 60, 0.95)',
  },
  shopIndicatorContainer: {
    width: 44,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopBadge: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  mediaControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 44,
  },
  mediaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(22, 22, 26, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
  },
  mediaButtonDisabled: {
    opacity: 0.35,
    cursor: 'default',
  },
  mediaButtonPressed: {
    backgroundColor: 'rgba(40, 40, 48, 0.9)',
  },
  mediaCounterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mediaCounterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
});
