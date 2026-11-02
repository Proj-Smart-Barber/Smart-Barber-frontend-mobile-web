/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingPage } from '../ui/LandingPage';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('@/features/auth', () => ({ useSession: () => ({ status: 'unauthenticated' }) }));
vi.mock('@/shared/brand', () => ({ BrandMark: () => null }));
vi.mock('@/shared/navigation/LiquidGlassView', () => ({
  LiquidGlassView: ({ children, style, variant }: React.PropsWithChildren<{ style: React.CSSProperties; variant: string }>) => (
    <div data-testid="floating-header" data-variant={variant} style={style}>{children}</div>
  ),
}));

describe('Cabeçalho da landing nativa', () => {
  it('mantém Entrar abaixo da área segura do iPhone e navegável', () => {
    render(<LandingPage />);
    const header = screen.getByTestId('floating-header');
    expect(header.style.top).toBe('71px');
    expect(header.style.position).toBe('absolute');
    expect(header.dataset.variant).toBe('navigation');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(push).toHaveBeenCalledWith('/(auth)/login');
  });
});
