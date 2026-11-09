import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

export function usePresenceTransition(open: boolean, options: {
  enterDuration: number;
  exitDuration: number;
  reducedMotion: boolean;
  scopeKey?: string;
  onExited?: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'entering' | 'open' | 'exiting' | 'closed'>(open ? 'entering' : 'closed');
  const progress = useRef(new Animated.Value(open ? 0 : 1)).current;
  const generation = useRef(0);
  const presented = useRef(open);
  const onExited = useRef(options.onExited);
  onExited.current = options.onExited;
  useEffect(() => {
    const epoch = ++generation.current;
    progress.stopAnimation();
    if (!open && !presented.current) { progress.setValue(0); setPhase('closed'); return; }
    if (open) presented.current = true;
    if (open) setMounted(true);
    setPhase(open ? 'entering' : 'exiting');
    const finish = () => {
      if (generation.current !== epoch) return;
      setPhase(open ? 'open' : 'closed');
      if (!open) { presented.current = false; setMounted(false); onExited.current?.(); }
    };
    if (options.reducedMotion) { progress.setValue(open ? 1 : 0); finish(); return; }
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? options.enterDuration : options.exitDuration,
      easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start(({ finished }) => { if (finished) finish(); });
    return () => { generation.current++; animation.stop(); };
  }, [open, options.enterDuration, options.exitDuration, options.reducedMotion, options.scopeKey, progress]);
  return { mounted, progress, phase };
}
