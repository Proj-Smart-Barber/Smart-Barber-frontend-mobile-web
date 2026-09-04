export const primitives = {
  color: {
    crimson: { 500: '#D1242B', 600: '#BD2026', glow: 'rgba(189, 32, 38, 0.22)' },
    obsidian: { 950: '#0B0B0B', 900: '#131313', 800: '#1F1F1F', 700: '#242424', 600: '#303030' },
    ivory: { 0: '#FFFFFF', 50: '#F7F5F3', 100: '#F0ECE9' },
    ink: { 950: '#171313', 600: '#5E5757' },
    neutral: { 0: '#FFFFFF', 100: '#E2E2E2', 300: '#B8C8DA', 500: '#708090', 950: '#000000' },
    status: { success: '#10B981', warning: '#F59E0B', error: '#FF5C62', destructive: '#DC2626' },
  },
} as const;
