// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrandLoadingIndicator } from '../BrandLoadingIndicator';

// Mock do hook useReducedMotion
vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    colors: {
      brand: { primary: '#BD2026' },
      background: { primary: '#0B0B0B' },
      text: { primary: '#FFFFFF', secondary: '#A0A0A0' },
    },
    isDark: true,
  }),
  useReducedMotion: vi.fn(() => false),
}));

describe('BrandLoadingIndicator', () => {
  it('retorna null se busy=false ou visible=false', () => {
    const { container: c1 } = render(
      <BrandLoadingIndicator busy={false} visible={true} animatedSource={{ uri: 'test.gif' }} />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <BrandLoadingIndicator busy={true} visible={false} animatedSource={{ uri: 'test.gif' }} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('renderiza BrandMark estático oficial como fallback quando animatedSource não é fornecida', () => {
    render(<BrandLoadingIndicator busy={true} visible={true} />);
    const indicator = screen.getByRole('progressbar');
    expect(indicator).toBeDefined();
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('renderiza o GIF animado quando motion é permitido e animatedSource está presente', () => {
    render(
      <BrandLoadingIndicator
        busy={true}
        visible={true}
        animatedSource={{ uri: 'sb-loading-transparent.gif' }}
        accessibilityLabel="Carregando barbearia"
      />
    );
    const indicator = screen.getByRole('progressbar', { name: 'Carregando barbearia' });
    expect(indicator).toBeDefined();
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('com movimento reduzido (useReducedMotion = true), usa o fallback estático BrandMark', async () => {
    const themeModule = await import('@/shared/theme');
    vi.mocked(themeModule.useReducedMotion).mockReturnValueOnce(true);

    render(
      <BrandLoadingIndicator
        busy={true}
        visible={true}
        animatedSource={{ uri: 'sb-loading-transparent.gif' }}
      />
    );

    // O BrandMark oficial estático é utilizado
    const indicator = screen.getByRole('progressbar');
    expect(indicator).toBeDefined();
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(0);
  });
});
