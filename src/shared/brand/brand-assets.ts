import { ImageSourcePropType } from 'react-native';

export const brand = {
  logo: {
    full: {
      dark: require('../../../assets/images/logos/01_principal_crimson_sobre_obsidian.png'),
      inverse: require('../../../assets/images/logos/02_ivory_sobre_obsidian.png'),
      light: require('../../../assets/images/logos/03_obsidian_sobre_ivory.png'),
      onCrimson: require('../../../assets/images/logos/04_ivory_sobre_crimson.png'),
    },
    monochromeDark: require('../../../assets/images/logos/08_monocromatico_preto_sobre_branco.png'),
    monochromeLight: require('../../../assets/images/logos/09_monocromatico_branco_sobre_preto.png'),
  },
  icon: {
    default: require('../../../assets/images/logos/05_app_icon_obsidian_crimson.png'),
    onCrimson: require('../../../assets/images/logos/06_app_icon_crimson_ivory.png'),
    light: require('../../../assets/images/logos/07_app_icon_ivory_obsidian.png'),
  },
  symbol: {
    crimson: require('../../../assets/images/logos/10_simbolo_crimson_transparente.png'),
    obsidian: require('../../../assets/images/logos/11_simbolo_obsidian_transparente.png'),
    ivory: require('../../../assets/images/logos/12_simbolo_ivory_transparente.png'),
  },
} as const;

export type BrandMarkVariant =
  | 'symbol-crimson'
  | 'symbol-obsidian'
  | 'symbol-ivory'
  | 'full-dark'
  | 'full-inverse'
  | 'full-light'
  | 'full-on-crimson'
  | 'icon-default'
  | 'icon-light';

export function getBrandSource(variant: BrandMarkVariant): ImageSourcePropType {
  const variants: Record<BrandMarkVariant, ImageSourcePropType> = {
    'symbol-crimson': brand.symbol.crimson,
    'symbol-obsidian': brand.symbol.obsidian,
    'symbol-ivory': brand.symbol.ivory,
    'full-dark': brand.logo.full.dark,
    'full-inverse': brand.logo.full.inverse,
    'full-light': brand.logo.full.light,
    'full-on-crimson': brand.logo.full.onCrimson,
    'icon-default': brand.icon.default,
    'icon-light': brand.icon.light,
  };
  return variants[variant];
}
