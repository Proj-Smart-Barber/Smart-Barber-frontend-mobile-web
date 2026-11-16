import React, { createContext, useContext, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { motion } from './primitives/motion';
import { createComponentTokens } from './components/tokens';
const ThemeContext = createContext(null);
export function ThemeProvider({ children, initialMode = 'system', }) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState(initialMode);
    const isDark = useMemo(() => {
        if (mode === 'system') {
            return systemScheme === 'dark';
        }
        return mode === 'dark';
    }, [mode, systemScheme]);
    const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);
    const components = useMemo(() => createComponentTokens(colors), [colors]);
    const toggleTheme = () => {
        // Alterna a partir do tema realmente exibido. Isso evita o caso em que
        // mode === 'system' e o primeiro toque parece não fazer nada.
        setMode(isDark ? 'light' : 'dark');
    };
    const value = useMemo(() => ({
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
    }), [mode, isDark, colors, components]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme deve ser utilizado dentro de um ThemeProvider');
    }
    return context;
}
