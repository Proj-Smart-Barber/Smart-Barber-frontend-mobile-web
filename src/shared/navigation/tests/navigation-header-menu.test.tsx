// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ThemeProvider } from '@/shared/theme';
import { ClientHeader } from '@/features/discovery/ui/ClientHeader';
import { BottomCapsuleBar } from '@/shared/navigation/BottomCapsuleBar';
import { ClientNavigationShell } from '@/shared/navigation/ClientNavigationShell';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/(client)',
}));

const mockOpenDrawer = vi.fn();
const mockCloseDrawer = vi.fn();
vi.mock('@/shared/navigation/navigation-context', () => ({
  NavigationProvider: ({ children }: any) => <>{children}</>,
  useNavigation: () => ({
    activeDestination: 'home',
    isDrawerOpen: false,
    isDrawerVisible: false,
    drawerProgress: { interpolate: () => 0 },
    scrollCollapseProgress: { interpolate: () => 0 },
    openDrawer: mockOpenDrawer,
    closeDrawer: mockCloseDrawer,
  }),
  useOptionalNavigation: () => ({
    openDrawer: mockOpenDrawer,
    closeDrawer: mockCloseDrawer,
  }),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

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

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    identity: { id: 'user-1', name: 'Carlos Eduardo Silva', email: 'carlos@exemplo.com' },
    memberships: [],
    selectedShopId: 'shop-1',
    isOwner: false,
  }),
}));

vi.mock('@/features/auth/model/use-session', () => ({
  useSession: () => ({
    identity: { id: 'user-1', name: 'Carlos Eduardo Silva', email: 'carlos@exemplo.com' },
    memberships: [],
    selectedShopId: 'shop-1',
    isOwner: false,
  }),
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

describe('ClientHeader & Bottom Navigation UX Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ClientHeader (canto superior)', () => {
    it('não renderiza o botão hambúrguer no topo', () => {
      renderWithTheme(<ClientHeader />);
      expect(screen.queryByLabelText('Abrir menu de navegação')).toBeNull();
    });

    it('renderiza o botão de conta explícito com o rótulo "Conta" e as iniciais', () => {
      renderWithTheme(<ClientHeader />);

      const accountBtn = screen.getByRole('button', { name: /Acessar Minha Conta/i });
      expect(accountBtn).toBeDefined();
      expect(screen.getByText('Conta')).toBeDefined();
      expect(screen.getByText('CE')).toBeDefined();
    });

    it('navega para o perfil ao clicar no botão de conta explícito', () => {
      renderWithTheme(<ClientHeader />);

      const accountBtn = screen.getByRole('button', { name: /Acessar Minha Conta/i });
      fireEvent.click(accountBtn);
      expect(mockPush).toHaveBeenCalledWith('/(client)/profile');
    });

    it('navega para notificações ao clicar no botão de notificações', () => {
      renderWithTheme(<ClientHeader />);

      const notifBtn = screen.getByRole('button', { name: /Ver notificações/i });
      fireEvent.click(notifBtn);
      expect(mockPush).toHaveBeenCalledWith('/(client)/notifications');
    });
  });

  describe('BottomCapsuleBar (barra inferior)', () => {
    it('renderiza o botão Menu na barra inferior', () => {
      renderWithTheme(<BottomCapsuleBar />);

      expect(screen.getByText('Menu')).toBeDefined();
      const menuBtn = screen.getByRole('button', { name: /Abrir menu lateral/i });
      expect(menuBtn).toBeDefined();
    });

    it('dispara openDrawer ao clicar no botão Menu da barra inferior', () => {
      renderWithTheme(<BottomCapsuleBar />);

      const menuBtn = screen.getByRole('button', { name: /Abrir menu lateral/i });
      fireEvent.click(menuBtn);
      expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
    });

    it('posiciona o botão Menu no lado esquerdo da barra inferior', () => {
      renderWithTheme(<BottomCapsuleBar />);

      const tablist = screen.getByRole('tablist', { name: /Navegação principal da aplicação/i });
      expect(tablist.firstElementChild?.textContent).toContain('Menu');
    });
  });

  describe('ClientNavigationShell (barra e drawer do cliente)', () => {
    it('renderiza os tabs principais e o botão Menu no tablist', () => {
      renderWithTheme(
        <ClientNavigationShell>
          <div>Conteúdo</div>
        </ClientNavigationShell>,
      );

      expect(screen.getByText('Início')).toBeDefined();
      expect(screen.getByText('Explorar')).toBeDefined();
      expect(screen.getByText('Agendar')).toBeDefined();
      expect(screen.getByText('Conta')).toBeDefined();
      expect(screen.getByText('Menu')).toBeDefined();
    });

    it('posiciona o botão Menu no lado esquerdo (primeiro item da barra)', () => {
      renderWithTheme(
        <ClientNavigationShell>
          <div>Conteúdo</div>
        </ClientNavigationShell>,
      );

      const tablist = screen.getByRole('tablist', { name: /Navegação principal do cliente/i });
      expect(tablist.firstElementChild?.textContent).toContain('Menu');
    });

    it('dispara openDrawer ao tocar no botão Menu da barra do cliente', () => {
      renderWithTheme(
        <ClientNavigationShell>
          <div>Conteúdo</div>
        </ClientNavigationShell>,
      );

      const menuBtn = screen.getByRole('button', { name: /Abrir menu de navegação/i });
      fireEvent.click(menuBtn);
      expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
    });
  });
});
