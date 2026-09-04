import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeColors, lightColors, darkColors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { motion } from './primitives/motion';
import { createComponentTokens } from './components/tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextData {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  motion: typeof motion;
  components: ReturnType<typeof createComponentTokens>;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextData | null>(null);

export function ThemeProvider({
  children,
  initialMode = 'system',
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);
  const components = useMemo(() => createComponentTokens(colors), [colors]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(
    () => ({
      mode,
      isDark,
      colors,
      typography,
      spacing,
      radius,
      motion,
      components,
      setMode,
      toggleTheme,
    }),
    [mode, isDark, colors, components]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextData {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
  }
  return context;
}
