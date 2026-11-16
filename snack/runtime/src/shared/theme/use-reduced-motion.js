import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState } from 'react';
export function useReducedMotion() {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        var _a;
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduced(value)).catch(() => undefined);
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        let media;
        const updateWeb = () => { var _a; return setReduced((_a = media === null || media === void 0 ? void 0 : media.matches) !== null && _a !== void 0 ? _a : false); };
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
            media = window.matchMedia('(prefers-reduced-motion: reduce)');
            updateWeb();
            (_a = media.addEventListener) === null || _a === void 0 ? void 0 : _a.call(media, 'change', updateWeb);
        }
        return () => { var _a; mounted = false; subscription.remove(); (_a = media === null || media === void 0 ? void 0 : media.removeEventListener) === null || _a === void 0 ? void 0 : _a.call(media, 'change', updateWeb); };
    }, []);
    return reduced;
}
