import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform } from 'react-native';

const FALLBACK_SETTLE_MARGIN_MS = 120;

export function usePresenceTransition(
  open: boolean,
  options: {
    enterDuration: number;
    exitDuration: number;
    reducedMotion: boolean;
    scopeKey?: string;
    onExited?: () => void;
  },
) {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'entering' | 'open' | 'exiting' | 'closed'>(
    open ? 'entering' : 'closed',
  );
  const progress = useRef(new Animated.Value(open ? 0 : 1)).current;
  const generation = useRef(0);
  const presented = useRef(open);
  const previousScopeKey = useRef(options.scopeKey);
  const onExited = useRef(options.onExited);
  onExited.current = options.onExited;

  useEffect(() => {
    const epoch = ++generation.current;
    const scopeChanged = previousScopeKey.current !== options.scopeKey;
    previousScopeKey.current = options.scopeKey;

    progress.stopAnimation();

    if (scopeChanged && !open) {
      presented.current = false;
      progress.setValue(0);
      setPhase('closed');
      setMounted(false);
      return;
    }

    if (!open && !presented.current) {
      progress.setValue(0);
      setPhase('closed');
      setMounted(false);
      return;
    }

    if (open) {
      presented.current = true;
      setMounted(true);
    }

    setPhase(open ? 'entering' : 'exiting');

    let settled = false;
    const targetValue = open ? 1 : 0;
    const duration = Math.max(
      0,
      open ? options.enterDuration : options.exitDuration,
    );

    const finish = () => {
      if (settled || generation.current !== epoch) return;
      settled = true;
      progress.setValue(targetValue);
      setPhase(open ? 'open' : 'closed');
      if (!open) {
        presented.current = false;
        setMounted(false);
        onExited.current?.();
      }
    };

    if (options.reducedMotion || duration === 0) {
      finish();
      return;
    }

    const fallbackTimer = setTimeout(() => {
      finish();
    }, duration + FALLBACK_SETTLE_MARGIN_MS);

    const animation = Animated.timing(progress, {
      toValue: targetValue,
      duration,
      easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });

    animation.start(() => {
      // Se a época ainda for a atual (sem transição sucessora), converge sempre
      // para o estado lógico esperado mesmo se a animação tiver sido interrompida (finished=false).
      clearTimeout(fallbackTimer);
      finish();
    });

    let removeWebLifecycle: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleLifecycleSettle = () => {
        if (!open) {
          clearTimeout(fallbackTimer);
          animation.stop();
          finish();
        }
      };
      window.addEventListener('pageshow', handleLifecycleSettle);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleLifecycleSettle);
      }
      removeWebLifecycle = () => {
        window.removeEventListener('pageshow', handleLifecycleSettle);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleLifecycleSettle);
        }
      };
    }

    const appStateSubscription =
      Platform.OS !== 'web' && typeof AppState?.addEventListener === 'function'
        ? AppState.addEventListener('change', (state) => {
            if (!open && state !== 'active') {
              clearTimeout(fallbackTimer);
              animation.stop();
              finish();
            }
          })
        : null;

    return () => {
      generation.current++;
      clearTimeout(fallbackTimer);
      removeWebLifecycle?.();
      appStateSubscription?.remove?.();
      animation.stop();
    };
  }, [
    open,
    options.enterDuration,
    options.exitDuration,
    options.reducedMotion,
    options.scopeKey,
    progress,
  ]);

  return { mounted, progress, phase };
}

