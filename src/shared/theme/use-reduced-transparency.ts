import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState } from 'react';

/**
 * Hook para detectar a preferência de redução de transparência do sistema (WCAG e acessibilidade visual).
 * Na Web escuta 'prefers-reduced-transparency: reduce'.
 * No Native consulta AccessibilityInfo.isReduceTransparencyEnabled quando disponível.
 */
export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    // React Native AccessibilityInfo (iOS/Android)
    if (typeof (AccessibilityInfo as any).isReduceTransparencyEnabled === 'function') {
      (AccessibilityInfo as any)
        .isReduceTransparencyEnabled()
        .then((value: boolean) => {
          if (mounted) setReduced(Boolean(value));
        })
        .catch(() => undefined);

      if (typeof (AccessibilityInfo as any).addEventListener === 'function') {
        const sub = (AccessibilityInfo as any).addEventListener(
          'reduceTransparencyChanged',
          (value: boolean) => {
            if (mounted) setReduced(Boolean(value));
          }
        );
        return () => {
          mounted = false;
          sub?.remove?.();
        };
      }
    }

    // Web Media Query
    let media: MediaQueryList | undefined;
    const updateWeb = () => {
      if (mounted) setReduced(media?.matches ?? false);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
      try {
        media = window.matchMedia('(prefers-reduced-transparency: reduce)');
        updateWeb();
        media.addEventListener?.('change', updateWeb);
      } catch {
        // Fallback silencioso para navegadores mais antigos
      }
    }

    return () => {
      mounted = false;
      media?.removeEventListener?.('change', updateWeb);
    };
  }, []);

  return reduced;
}
