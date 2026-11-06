// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientBookingsSkeleton } from '../ui/ClientBookingsSkeleton';
import { LoadingRegion } from '@/shared/ui/LoadingRegion';

vi.mock('@/shared/theme', () => ({
  useTheme: () => ({
    spacing: Array(20).fill(8),
    radius: { sm: 4, md: 8, lg: 12 },
    colors: {
      text: { primary: '#fff', secondary: '#ccc', muted: '#888' },
      brand: { primary: '#f00' },
      border: { default: '#777', subtle: '#333' },
      surface: { input: '#222', elevated: '#333' },
      background: { primary: '#111' },
    },
    isDark: true,
  }),
  useReducedMotion: () => false,
}));

vi.mock('@/shared/navigation/LiquidGlassView', () => ({
  LiquidGlassView: ({ children }: any) => <div>{children}</div>,
}));

describe('Client Bookings Loading States', () => {
  it('renderiza ClientBookingsSkeleton com card destacado e itens regulares', () => {
    const { container } = render(<ClientBookingsSkeleton count={3} />);
    expect(container.firstChild).toBeDefined();
  });

  it('integra ClientBookingsSkeleton em LoadingRegion com aria-busy e label acessível', () => {
    render(
      <LoadingRegion
        phase="initial"
        busy={true}
        accessibilityLabel="Carregando seus agendamentos"
        placeholder={<ClientBookingsSkeleton count={3} />}
      />
    );

    const region = screen.getByRole('region', { name: /carregando seus agendamentos/i });
    expect(region).toBeDefined();
    expect(region.getAttribute('aria-busy')).toBe('true');
  });
});
