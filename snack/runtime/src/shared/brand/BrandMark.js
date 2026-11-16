import { Image } from 'react-native';
import { getBrandSource } from './brand-assets';
export function BrandMark({ variant, size = 64, decorative = true, accessibilityLabel = 'Smart Barber', style }) {
    return (<Image source={getBrandSource(variant)} accessibilityRole="image" accessible={!decorative} accessibilityLabel={decorative ? undefined : accessibilityLabel} resizeMode="contain" style={[{ width: size, height: size }, style]}/>);
}
