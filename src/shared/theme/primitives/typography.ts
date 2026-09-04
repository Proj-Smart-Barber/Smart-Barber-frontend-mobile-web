import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  epilogue: {
    bold: Platform.select({ web: 'Epilogue, system-ui, sans-serif', default: 'Epilogue_700Bold' }),
    extraBold: Platform.select({ web: 'Epilogue, system-ui, sans-serif', default: 'Epilogue_800ExtraBold' }),
  },
  inter: {
    regular: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'Inter_400Regular' }),
    medium: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'Inter_500Medium' }),
    semiBold: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'Inter_600SemiBold' }),
    bold: Platform.select({ web: 'Inter, system-ui, sans-serif', default: 'Inter_700Bold' }),
  },
} as const;

export const typeScale = {
  display: { fontFamily: fontFamilies.epilogue.extraBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  h1: { fontFamily: fontFamilies.epilogue.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.35 },
  h2: { fontFamily: fontFamilies.epilogue.bold, fontSize: 20, lineHeight: 25, letterSpacing: -0.25 },
  h3: { fontFamily: fontFamilies.epilogue.bold, fontSize: 18, lineHeight: 23, letterSpacing: -0.15 },
  subhead: { fontFamily: fontFamilies.epilogue.bold, fontSize: 18, lineHeight: 23 },
  price: { fontFamily: fontFamilies.epilogue.bold, fontSize: 18, lineHeight: 23, fontVariant: ['tabular-nums'] },
  button: { fontFamily: fontFamilies.epilogue.bold, fontSize: 16, lineHeight: 20, letterSpacing: 0.1 },
  body: { fontFamily: fontFamilies.inter.medium, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fontFamilies.inter.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.inter.medium, fontSize: 13, lineHeight: 18 },
  badge: { fontFamily: fontFamilies.inter.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.35 },
  tab: { fontFamily: fontFamilies.inter.semiBold, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export const typography = {
  fontFamilies,
  styles: typeScale,
  fontWeights: { regular: '400', medium: '500', semibold: '600', bold: '700', extraBold: '800' } as const,
} as const;
