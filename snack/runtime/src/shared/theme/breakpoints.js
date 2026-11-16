import { useWindowDimensions } from 'react-native';
export function getAdaptiveSize(width) {
    if (width < 600)
        return 'compact';
    if (width < 840)
        return 'medium';
    return 'expanded';
}
export function useAdaptiveLayout() {
    const { width, height } = useWindowDimensions();
    const size = getAdaptiveSize(width);
    return { width, height, size, isCompact: size === 'compact', isMedium: size === 'medium', isExpanded: size === 'expanded', formMaxWidth: 480, contentMaxWidth: size === 'expanded' ? 1040 : 720 };
}
