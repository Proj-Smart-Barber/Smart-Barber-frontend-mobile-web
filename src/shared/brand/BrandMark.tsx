import { Image, ImageStyle, StyleProp } from 'react-native';
import { BrandMarkVariant, getBrandSource } from './brand-assets';

export interface BrandMarkProps {
  variant: BrandMarkVariant;
  size?: number;
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
}

export function BrandMark({ variant, size = 64, decorative = true, accessibilityLabel = 'Smart Barber', style }: BrandMarkProps) {
  return (
    <Image
      source={getBrandSource(variant)}
      accessibilityRole="image"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );
}
