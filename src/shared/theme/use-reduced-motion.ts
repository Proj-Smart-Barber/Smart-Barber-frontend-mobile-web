import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduced(value)).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    let media: MediaQueryList | undefined;
    const updateWeb = () => setReduced(media?.matches ?? false);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      media = window.matchMedia('(prefers-reduced-motion: reduce)');
      updateWeb();
      media.addEventListener?.('change', updateWeb);
    }
    return () => { mounted = false; subscription.remove(); media?.removeEventListener?.('change', updateWeb); };
  }, []);

  return reduced;
}
