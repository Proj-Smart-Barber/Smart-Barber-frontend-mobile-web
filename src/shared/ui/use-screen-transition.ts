import { useEffect, useRef } from 'react';
import { Animated, AppState, Easing, Platform } from 'react-native';
import { motion, useReducedMotion } from '../theme';

const SCREEN_TRANSITION_FALLBACK_MARGIN_MS = 120;

/** Destinos pares recebem fade de entrada sem manter outra rota ou player ativo. */
export function useScreenTransition(selectionKey: string) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(selectionKey);
  const generation = useRef(0);

  useEffect(() => {
    const epoch = ++generation.current;
    const changed = previous.current !== selectionKey;
    previous.current = selectionKey;

    opacity.stopAnimation();

    if (reduced || !changed) {
      opacity.setValue(1);
      return;
    }

    opacity.setValue(0);

    let settled = false;
    const settleVisible = () => {
      if (settled || generation.current !== epoch) return;
      settled = true;
      opacity.stopAnimation();
      opacity.setValue(1);
    };

    const duration = Math.max(0, motion.standard);
    const fallbackTimer = setTimeout(
      settleVisible,
      duration + SCREEN_TRANSITION_FALLBACK_MARGIN_MS,
    );

    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });

    animation.start(() => {
      clearTimeout(fallbackTimer);
      settleVisible();
    });

    let removeWebListeners: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleLifecycleRestore = () => {
        clearTimeout(fallbackTimer);
        animation.stop();
        settleVisible();
      };
      window.addEventListener('pageshow', handleLifecycleRestore);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleLifecycleRestore);
      }
      removeWebListeners = () => {
        window.removeEventListener('pageshow', handleLifecycleRestore);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleLifecycleRestore);
        }
      };
    }

    const appStateSubscription =
      Platform.OS !== 'web' && typeof AppState?.addEventListener === 'function'
        ? AppState.addEventListener('change', () => {
            clearTimeout(fallbackTimer);
            animation.stop();
            settleVisible();
          })
        : null;

    return () => {
      generation.current++;
      clearTimeout(fallbackTimer);
      removeWebListeners?.();
      appStateSubscription?.remove?.();
      animation.stop();
    };
  }, [selectionKey, reduced, opacity]);

  return opacity;
}

