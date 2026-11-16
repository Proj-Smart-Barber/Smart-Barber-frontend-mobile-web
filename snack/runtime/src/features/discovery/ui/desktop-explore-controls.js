import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spinner } from '../../../shared/ui/Spinner';
/**
 * Trilho / Linha de controles de navegação entre Barbearias (Unidades).
 * Respeita área de toque mínima de 44x44, foco e acessibilidade.
 */
export function DesktopShopControls({ currentIndex, totalCount, hasPrevious, hasNext, isLoadingNextPage = false, onPrevious, onNext, direction = 'vertical', disabled = false, }) {
    const isHorizontal = direction === 'horizontal';
    const canGoPrevious = !disabled && hasPrevious;
    const canGoNext = !disabled && hasNext && !isLoadingNextPage;
    return (<View style={[
            styles.shopControlsContainer,
            isHorizontal ? styles.shopControlsRow : styles.shopControlsColumn,
        ]} testID="desktop-shop-controls">
      {/* Botão Anterior */}
      <Pressable accessibilityRole="button" accessibilityLabel="Barbearia anterior" aria-disabled={!canGoPrevious} disabled={!canGoPrevious} onPress={canGoPrevious ? onPrevious : undefined} style={({ pressed }) => [
            styles.controlButton,
            !canGoPrevious && styles.controlButtonDisabled,
            pressed && canGoPrevious && styles.controlButtonPressed,
        ]}>
        <Ionicons name={isHorizontal ? 'chevron-back' : 'chevron-up'} size={20} color={canGoPrevious ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'}/>
      </Pressable>

      {/* Indicador de Unidade ou Loading de Próxima Página */}
      <View style={styles.shopIndicatorContainer}>
        {isLoadingNextPage ? (<View accessibilityRole="status" accessibilityLabel="Carregando mais barbearias…" style={styles.spinnerWrapper}>
            <Spinner size="small"/>
          </View>) : (<View style={styles.shopBadge}>
            <Ionicons name="storefront-outline" size={14} color="#94a3b8"/>
          </View>)}
      </View>

      {/* Botão Próximo */}
      <Pressable accessibilityRole="button" accessibilityLabel="Próxima barbearia" aria-disabled={!canGoNext} disabled={!canGoNext} onPress={canGoNext ? onNext : undefined} style={({ pressed }) => [
            styles.controlButton,
            !canGoNext && styles.controlButtonDisabled,
            pressed && canGoNext && styles.controlButtonPressed,
        ]}>
        <Ionicons name={isHorizontal ? 'chevron-forward' : 'chevron-down'} size={20} color={canGoNext ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'}/>
      </Pressable>
    </View>);
}
/**
 * Controles de mídia (foto / vídeo) logo abaixo do palco.
 * Área de toque de pelo menos 44x44, contador explícito e setas direcionais.
 */
export function DesktopMediaControls({ currentIndex, totalCount, hasPrevious, hasNext, onPrevious, onNext, disabled = false, }) {
    const canGoPrevious = !disabled && hasPrevious;
    const canGoNext = !disabled && hasNext;
    const displayCount = Math.max(1, totalCount);
    const displayCurrent = Math.min(displayCount, currentIndex + 1);
    return (<View style={styles.mediaControlsBar} testID="desktop-media-controls">
      {/* Botão Foto Anterior */}
      <Pressable accessibilityRole="button" accessibilityLabel="Mídia anterior" aria-disabled={!canGoPrevious} disabled={!canGoPrevious} onPress={canGoPrevious ? onPrevious : undefined} style={({ pressed }) => [
            styles.mediaButton,
            !canGoPrevious && styles.mediaButtonDisabled,
            pressed && canGoPrevious && styles.mediaButtonPressed,
        ]}>
        <Ionicons name="chevron-back" size={18} color={canGoPrevious ? '#ffffff' : 'rgba(255, 255, 255, 0.25)'}/>
      </Pressable>

      {/* Indicador de Mídia (ex: 2 de 5) */}
      <View style={styles.mediaCounterBadge}>
        <Text style={styles.mediaCounterText}>
          {`${displayCurrent} de ${displayCount}`}
        </Text>
      </View>

      {/* Botão Próxima Foto */}
      <Pressable accessibilityRole="button" accessibilityLabel="Próxima mídia" aria-disabled={!canGoNext} disabled={!canGoNext} onPress={canGoNext ? onNext : undefined} style={({ pressed }) => [
            styles.mediaButton,
            !canGoNext && styles.mediaButtonDisabled,
            pressed && canGoNext && styles.mediaButtonPressed,
        ]}>
        <Ionicons name="chevron-forward" size={18} color={canGoNext ? '#ffffff' : 'rgba(255, 255, 255, 0.25)'}/>
      </Pressable>
    </View>);
}
/**
 * Container local com suporte a navegação por teclado.
 * Não adiciona listeners globais na janela; responde apenas quando o foco estiver
 * contido no feed e não intercepta formulários, inputs ou controles nativos de vídeo.
 */
export function DesktopExploreKeyboardContainer({ children, onPreviousShop, onNextShop, onPreviousMedia, onNextMedia, disabled = false, style, }) {
    const handleKeyDown = (e) => {
        var _a, _b, _c, _d, _e;
        if (disabled)
            return;
        const target = e.target;
        if (target) {
            const tagName = (_a = target.tagName) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
                return; // Preserva digitação do usuário em inputs
            }
            if (tagName === 'video' || tagName === 'audio') {
                return; // Preserva controles de reprodução de mídia
            }
        }
        if (e.defaultPrevented)
            return;
        switch (e.key) {
            case 'ArrowUp':
                (_b = e.preventDefault) === null || _b === void 0 ? void 0 : _b.call(e);
                onPreviousShop();
                break;
            case 'ArrowDown':
                (_c = e.preventDefault) === null || _c === void 0 ? void 0 : _c.call(e);
                onNextShop();
                break;
            case 'ArrowLeft':
                (_d = e.preventDefault) === null || _d === void 0 ? void 0 : _d.call(e);
                onPreviousMedia();
                break;
            case 'ArrowRight':
                (_e = e.preventDefault) === null || _e === void 0 ? void 0 : _e.call(e);
                onNextMedia();
                break;
        }
    };
    return (<View style={[{ flex: 1 }, style]} testID="desktop-keyboard-nav-container" {...{ tabIndex: 0, onKeyDown: handleKeyDown }}>
      {children}
    </View>);
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
        cursor: 'auto',
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
        cursor: 'auto',
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
