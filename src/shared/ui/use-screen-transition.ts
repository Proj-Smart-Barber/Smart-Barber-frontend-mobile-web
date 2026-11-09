import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { motion, useReducedMotion } from '../theme';

/** Destinos pares recebem fade de entrada sem manter outra rota ou player ativo. */
export function useScreenTransition(selectionKey: string) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(selectionKey);
  useEffect(() => {
    opacity.stopAnimation();
    if (reduced || previous.current === selectionKey) { opacity.setValue(1); return; }
    previous.current = selectionKey;
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {toValue: 1,duration:motion.standard,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS !== 'web'});
    animation.start();
    return () => animation.stop();
  }, [selectionKey, reduced, opacity]);
  return opacity;
}
