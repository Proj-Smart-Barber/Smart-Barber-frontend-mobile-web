// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BootstrapScreen } from '../BootstrapScreen';

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { primary: '#0B0B0B' },
      brand: { primary: '#D32F2F' },
      text: { secondary: '#9E9E9E', body: '#FFFFFF' },
      feedback: { error: '#E53935' },
    },
    spacing: { 6: 24 },
    typography: {
      styles: {
        bodySm: { fontSize: 14 },
      },
      fontWeights: {
        regular: '400',
      },
    },
    isDark: true,
  }),
  useReducedMotion: () => false,
}));

describe('BootstrapScreen', () => {
  it('renderiza BrandMark padrão e Spinner quando clientLoadingBrandSource não é fornecida', () => {
    render(<BootstrapScreen message="Verificando sua sessão…" />);

    expect(screen.getByText('Verificando sua sessão…')).toBeDefined();
    expect(screen.getByRole('progressbar', { name: 'Verificando sua sessão…' })).toBeDefined();
  });

  it('renderiza BrandLoadingIndicator sem Spinner duplicado quando clientLoadingBrandSource é fornecida', () => {
    render(
      <BootstrapScreen
        message="Inicializando cliente…"
        clientLoadingBrandSource={{ uri: 'test.gif' }}
      />
    );

    expect(screen.getByText('Inicializando cliente…')).toBeDefined();
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(0);
  });
});
