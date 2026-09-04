import { primitives } from '../primitives/colors';

export interface ThemeColors {
  isDark: boolean;
  brand: { primary: string; primaryPressed: string; primaryGlow: string; primaryHover: string; silver: string };
  feedback: { success: string; successBackground: string; successBorder: string; warning: string; warningBackground: string; warningBorder: string; error: string; errorBackground: string; errorBorder: string; info: string; infoBackground: string; infoBorder: string; destructive: string; destructivePressed: string };
  background: { primary: string; secondary: string; card: string; elevated: string; overlay: string };
  surface: { default: string; elevated: string; input: string; inputFocus: string; disabled: string; selected: string; badge: string };
  text: { primary: string; body: string; secondary: string; muted: string; disabled: string; inverse: string; brand: string; crimson: string };
  border: { default: string; subtle: string; focus: string; error: string; selected: string; ghost: string };
}

const c = primitives.color;

export const darkColors: ThemeColors = {
  isDark: true,
  brand: { primary: c.crimson[600], primaryPressed: c.crimson[500], primaryGlow: c.crimson.glow, primaryHover: c.crimson[500], silver: c.neutral[300] },
  feedback: {
    success: c.status.success, successBackground: 'rgba(16, 185, 129, 0.14)', successBorder: 'rgba(16, 185, 129, 0.48)',
    warning: c.status.warning, warningBackground: 'rgba(245, 158, 11, 0.14)', warningBorder: 'rgba(245, 158, 11, 0.48)',
    error: c.status.error, errorBackground: 'rgba(255, 92, 98, 0.14)', errorBorder: 'rgba(255, 92, 98, 0.48)',
    info: c.neutral[300], infoBackground: 'rgba(184, 200, 218, 0.12)', infoBorder: 'rgba(184, 200, 218, 0.3)',
    destructive: c.status.destructive, destructivePressed: '#B91C1C',
  },
  background: { primary: c.obsidian[950], secondary: c.obsidian[900], card: c.obsidian[800], elevated: c.obsidian[700], overlay: 'rgba(0, 0, 0, 0.78)' },
  surface: { default: c.obsidian[900], elevated: c.obsidian[800], input: c.obsidian[700], inputFocus: c.obsidian[600], disabled: '#191919', selected: 'rgba(189, 32, 38, 0.16)', badge: 'rgba(189, 32, 38, 0.16)' },
  text: { primary: c.neutral[0], body: c.neutral[100], secondary: c.neutral[300], muted: c.neutral[500], disabled: '#777777', inverse: c.neutral[950], brand: c.crimson[600], crimson: c.crimson[600] },
  border: { default: 'rgba(255, 255, 255, 0.14)', subtle: 'rgba(255, 255, 255, 0.08)', focus: c.crimson[600], error: c.status.error, selected: c.crimson[600], ghost: 'rgba(189, 32, 38, 0.36)' },
};

export const lightColors: ThemeColors = {
  isDark: false,
  brand: { primary: c.crimson[600], primaryPressed: c.crimson[500], primaryGlow: c.crimson.glow, primaryHover: c.crimson[500], silver: c.ink[600] },
  feedback: {
    success: c.status.success, successBackground: '#ECFDF5', successBorder: '#6EE7B7',
    warning: c.status.warning, warningBackground: '#FFFBEB', warningBorder: '#FCD34D',
    error: c.status.error, errorBackground: '#FFF0F1', errorBorder: '#FF9BA0',
    info: c.ink[600], infoBackground: c.ivory[100], infoBorder: '#D5CECA',
    destructive: c.status.destructive, destructivePressed: '#B91C1C',
  },
  background: { primary: c.ivory[50], secondary: c.ivory[100], card: c.ivory[0], elevated: c.ivory[0], overlay: 'rgba(23, 19, 19, 0.48)' },
  surface: { default: c.ivory[0], elevated: c.ivory[100], input: c.ivory[0], inputFocus: c.ivory[100], disabled: '#E4DEDB', selected: 'rgba(189, 32, 38, 0.1)', badge: 'rgba(189, 32, 38, 0.1)' },
  text: { primary: c.ink[950], body: c.ink[950], secondary: c.ink[600], muted: c.ink[600], disabled: '#8A8180', inverse: c.ivory[0], brand: c.crimson[600], crimson: c.crimson[600] },
  border: { default: '#D5CECA', subtle: '#E7E0DD', focus: c.crimson[600], error: c.status.error, selected: c.crimson[600], ghost: 'rgba(189, 32, 38, 0.3)' },
};
