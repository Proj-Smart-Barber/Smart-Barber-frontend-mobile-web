import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState } from 'react';
/**
 * Hook para detectar a preferência de redução de transparência do sistema (WCAG e acessibilidade visual).
 * Na Web escuta 'prefers-reduced-transparency: reduce'.
 * No Native consulta AccessibilityInfo.isReduceTransparencyEnabled quando disponível.
 */
export function useReducedTransparency() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        var _a;
        let mounted = true;
        // React Native AccessibilityInfo (iOS/Android)
        if (typeof AccessibilityInfo.isReduceTransparencyEnabled === 'function') {
            AccessibilityInfo
                .isReduceTransparencyEnabled()
                .then((value) => {
                if (mounted)
                    setReduced(Boolean(value));
            })
                .catch(() => undefined);
            if (typeof AccessibilityInfo.addEventListener === 'function') {
                const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => {
                    if (mounted)
                        setReduced(Boolean(value));
                });
                return () => {
                    var _a;
                    mounted = false;
                    (_a = sub === null || sub === void 0 ? void 0 : sub.remove) === null || _a === void 0 ? void 0 : _a.call(sub);
                };
            }
        }
        // Web Media Query
        let media;
        const updateWeb = () => {
            var _a;
            if (mounted)
                setReduced((_a = media === null || media === void 0 ? void 0 : media.matches) !== null && _a !== void 0 ? _a : false);
        };
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
            try {
                media = window.matchMedia('(prefers-reduced-transparency: reduce)');
                updateWeb();
                (_a = media.addEventListener) === null || _a === void 0 ? void 0 : _a.call(media, 'change', updateWeb);
            }
            catch {
                // Fallback silencioso para navegadores mais antigos
            }
        }
        return () => {
            var _a;
            mounted = false;
            (_a = media === null || media === void 0 ? void 0 : media.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(media, 'change', updateWeb);
        };
    }, []);
    return reduced;
}
