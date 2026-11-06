// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import ClientNotificationsScreen from '@/app/(client)/notifications';
import * as notificationQueries from '../model/notification-queries';

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('@/shared/navigation/LiquidGlassView', () => ({
  LiquidGlassView: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    status: 'authenticated',
    identity: { id: 'user-1', name: 'Cliente Teste' },
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('ClientNotificationsScreen Loading Behavior', () => {
  it('preserva cabeçalho montado enquanto exibe NotificationsSkeleton via LoadingRegion', () => {
    vi.spyOn(notificationQueries, 'useNotificationsFeed').mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn() as any,
      isRefetching: false,
    } as any);

    render(
      <ThemeProvider>
        <ClientNotificationsScreen />
      </ThemeProvider>
    );

    // Cabeçalho e botões permanecem montados
    expect(screen.getByText('Notificações')).toBeDefined();
    expect(screen.getByText(/Avisos, confirmações e atualizações/i)).toBeDefined();
    expect(screen.getByText('Voltar')).toBeDefined();
    expect(screen.getByText('Conta')).toBeDefined();

    // LoadingRegion ativo com label acessível
    const region = screen.getByRole('region', { name: /carregando notificações/i });
    expect(region).toBeDefined();
    expect(region.getAttribute('aria-busy')).toBe('true');
  });
});
