import { Platform } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

export function isIosDevice(): boolean {
  if (Platform.OS === 'ios') return true;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    const platform = (navigator as any).platform || '';
    const maxTouchPoints = (navigator as any).maxTouchPoints || 0;
    return /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  }
  return false;
}

export function isStandalonePwa(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const isStandaloneNavigator = Boolean((window.navigator as any)?.standalone);
    const isStandaloneMedia = Boolean(window.matchMedia?.('(display-mode: standalone)').matches);
    return isStandaloneNavigator || isStandaloneMedia;
  }
  return false;
}

export function getScreenMaxDimension(): number {
  if (typeof window !== 'undefined' && window.screen) {
    return Math.max(window.screen.width || 0, window.screen.height || 0);
  }
  return 0;
}

/**
 * Normaliza e protege os insets de safe area em todas as plataformas.
 * Previne que o WebKit (Safari/PWA) infle insets.bottom para mais de 100px por causa de overflow no document,
 * e assegura que no PWA standalone do iOS o topo não colida com a Dynamic Island / notch.
 */
export function clampInsets(
  rawInsets: EdgeInsets,
  isIos: boolean,
  isStandalone: boolean,
  screenMaxDim: number = 0,
): EdgeInsets {
  // Dispositivos Apple com entalhe ou Dynamic Island têm dimensão >= 812px.
  // Se screenMaxDim não estiver disponível (SSR / mock), assume modelo moderno no iOS.
  const hasNotch = screenMaxDim > 0 ? screenMaxDim >= 812 : true;

  // 1. Bottom Inset (Home indicator físico do iPhone é no máximo 34px em retrato):
  let bottom = rawInsets.bottom;
  if (isIos) {
    if (isStandalone && bottom === 0 && hasNotch) {
      bottom = 34;
    } else {
      bottom = Math.min(Math.max(0, bottom), 34);
    }
  } else {
    bottom = Math.min(Math.max(0, bottom), 34);
  }

  // 2. Top Inset:
  // No iOS standalone PWA com 'black-translucent', o conteúdo entra sob a barra de status / Dynamic Island.
  let top = rawInsets.top;
  if (isIos) {
    if (isStandalone) {
      const minTop = hasNotch ? 48 : 20;
      top = Math.min(Math.max(top, minTop), 64);
    } else {
      top = Math.min(Math.max(0, top), 64);
    }
  } else {
    top = Math.min(Math.max(0, top), 64);
  }

  return {
    top,
    bottom,
    left: Math.min(Math.max(0, rawInsets.left), 44),
    right: Math.min(Math.max(0, rawInsets.right), 44),
  };
}

export function useAppSafeArea(): EdgeInsets {
  const insets = useSafeAreaInsets();
  const isIos = isIosDevice();
  const isStandalone = isStandalonePwa();
  const screenMaxDim = getScreenMaxDimension();
  return clampInsets(insets, isIos, isStandalone, screenMaxDim);
}
