// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ThemeProvider } from '@/shared/theme';
import { ClientNavigationShell } from '../ClientNavigationShell';
import { ClientNavbarMetricsContext } from '../ClientNavbarMetrics';

const mockPush = vi.fn();
let mockPathname = '/(client)';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

let mockDrawerOpen = false;
let mockDrawerVisible = false;
const mockOpenDrawer = vi.fn(() => {
  mockDrawerOpen = true;
  mockDrawerVisible = true;
});
const mockCloseDrawer = vi.fn(() => {
  mockDrawerOpen = false;
});

vi.mock('@/shared/navigation/navigation-context', () => ({
  NavigationProvider: ({ children }: any) => <>{children}</>,
  useNavigation: () => ({
    activeDestination: 'home',
    isDrawerOpen: mockDrawerOpen,
    isDrawerVisible: mockDrawerVisible,
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

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    identity: { id: 'client-1', name: 'Ana Souza', email: 'ana@exemplo.com' },
    memberships: [],
    selectedShopId: 'shop-1',
    isOwner: false,
    signOut: vi.fn(),
  }),
}));

function renderShell(props: { onRequestBooking?: () => void; interactionBlocked?: boolean } = {}) {
  return render(
    <ThemeProvider initialMode="dark">
      <ClientNavigationShell {...props}>
        <div data-testid="shell-child">Conteúdo da tela</div>
      </ClientNavigationShell>
    </ThemeProvider>,
  );
}

describe('ClientNavigationShell — Tarefa 2: Cápsula e Drawer do Cliente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/(client)';
    mockDrawerOpen = false;
    mockDrawerVisible = false;
  });

  describe('Cápsula inferior mobile (5 controles)', () => {
    it('renderiza exatamente os 5 controles na ordem: Menu, Explorar, Agendar, Meus agendamentos, Conta', () => {
      renderShell();

      const tablist = screen.getByRole('tablist', { name: /Navegação principal do cliente/i });
      expect(tablist).toBeDefined();

      const items = Array.from(tablist.children);
      expect(items.length).toBe(5);

      // Ordem exata adotada no handoff: Menu | Explorar | Agendar | Meus agendamentos | Conta
      expect(items[0].textContent).toContain('Menu');
      expect(items[1].textContent).toContain('Explorar');
      expect(items[2].textContent).toContain('Agendar');
      expect(items[3].textContent).toContain('Agenda');
      expect(items[3].getAttribute('aria-label')).toContain('Meus agendamentos');
      expect(items[4].textContent).toContain('Conta');
    });

    it('posiciona Menu no extremo esquerdo com role button e estado expanded', () => {
      renderShell();

      const menuBtn = screen.getByRole('button', { name: /Abrir menu de navegação/i });
      expect(menuBtn).toBeDefined();
      expect(menuBtn.getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(menuBtn);
      expect(mockOpenDrawer).toHaveBeenCalledTimes(1);
    });

    it('mantém Agendar no centro com role button e sem seleção falsa de aba', () => {
      const onRequestBooking = vi.fn();
      renderShell({ onRequestBooking });

      const bookBtn = screen.getByRole('button', { name: /Agendar/i });
      expect(bookBtn).toBeDefined();
      // Não deve ter aria-selected="true"
      expect(bookBtn.getAttribute('aria-selected')).not.toBe('true');

      fireEvent.click(bookBtn);
      expect(onRequestBooking).toHaveBeenCalledTimes(1);
    });

    it('previne múltiplos disparos em duplo clique rápido no botão Agendar', () => {
      const onRequestBooking = vi.fn();
      renderShell({ onRequestBooking });

      const bookBtn = screen.getByRole('button', { name: /Agendar/i });
      fireEvent.click(bookBtn);
      fireEvent.click(bookBtn);

      expect(onRequestBooking).toHaveBeenCalledTimes(1);
    });

    it('seleciona Explorar na rota explore e mantém Meus agendamentos não selecionado', () => {
      mockPathname = '/(client)/explore';
      renderShell();

      const exploreTab = screen.getByRole('tab', { name: /Explorar, selecionado/i });
      expect(exploreTab).toBeDefined();

      const bookingsTab = screen.getByRole('tab', { name: /Meus agendamentos, não selecionado/i });
      expect(bookingsTab).toBeDefined();
    });

    it('diferencia visualmente a aba selecionada do botão de ação Agendar (C-002)', () => {
      mockPathname = '/(client)/explore';
      renderShell();

      const bookBtn = screen.getByRole('button', { name: /Agendar/i });
      const activeTab = screen.getByRole('tab', { name: /Explorar, selecionado/i });
      const inactiveTab = screen.getByRole('tab', { name: /Meus agendamentos, não selecionado/i });

      // Agendar mantém o preenchimento de ação primária (Crimson)
      // A aba selecionada usa tratamento secundário da família de vidro neutro (não Crimson)
      const bookBg = bookBtn.style.backgroundColor;
      const activeTabBg = activeTab.style.backgroundColor;
      expect(activeTabBg).not.toBe(bookBg);
      expect(activeTab.style.borderWidth).toBe('1px');
    });

    it('seleciona Conta quando na rota de perfil', () => {
      mockPathname = '/(client)/profile';
      renderShell();

      const profileTab = screen.getByRole('tab', { name: /Conta, selecionado/i });
      expect(profileTab).toBeDefined();
    });

    it('navega para /(client)/bookings ao clicar em Meus agendamentos', () => {
      mockPathname = '/(client)/explore';
      renderShell();

      const bookingsTab = screen.getByRole('tab', { name: /Meus agendamentos/i });
      fireEvent.click(bookingsTab);
      expect(mockPush).toHaveBeenCalledWith('/(client)/bookings');
    });

    it.each([
      { label: 'toque sem click nativo', event: null, activates: true },
      { label: 'gesto de rolagem', event: 'touchmove', activates: false },
      { label: 'toque cancelado', event: 'touchcancel', activates: false },
    ])('trata $label na aba Agenda', ({ event, activates }) => {
      renderShell();
      const agenda = screen.getByRole('tab', { name: /Meus agendamentos/i });
      const touch = { identifier: 1, clientX: 100, clientY: 100 };
      const hitTest = vi.spyOn(document, 'elementFromPoint').mockReturnValue(agenda);

      try {
        fireEvent.touchStart(agenda, { touches: [touch], changedTouches: [touch] });
        if (event) {
          const moved = { ...touch, clientX: 130 } as Touch;
          fireEvent(agenda, new TouchEvent(event, {
            bubbles: true,
            touches: event === 'touchmove' ? [moved] : [],
            changedTouches: [moved],
          }));
        }
        const end = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          changedTouches: [touch as Touch],
        });
        fireEvent(agenda, end);

        expect(end.defaultPrevented).toBe(activates);
        if (activates) {
          expect(mockPush).toHaveBeenCalledExactlyOnceWith('/(client)/bookings');
        } else {
          expect(mockPush).not.toHaveBeenCalled();
        }
      } finally {
        hitTest.mockRestore();
      }
    });

    it('desabilita interação e oculta acessibilidade da cápsula quando interactionBlocked está ativo', () => {
      const onRequestBooking = vi.fn();
      renderShell({ onRequestBooking, interactionBlocked: true });

      // Quando interactionBlocked=true, cápsula tem aria-hidden="true" e pointerEvents: 'none'
      expect(screen.queryByRole('button', { name: /Agendar/i })).toBeNull();
      const hiddenBookBtn = screen.getByRole('button', { name: /Agendar/i, hidden: true });
      const capsule = hiddenBookBtn.closest<HTMLElement>('[aria-hidden="true"]');
      // RNW precisa aplicar box-none por classe CSS, sem deixar um pointer-events inline.
      expect(capsule?.style.pointerEvents).toBe('');
      expect(hiddenBookBtn.getAttribute('aria-disabled')).toBe('true');
      expect(hiddenBookBtn.tabIndex).toBe(-1);
      fireEvent.click(hiddenBookBtn);
      expect(onRequestBooking).not.toHaveBeenCalled();
    });
  });

  describe('Drawer lateral mobile', () => {
    it('preserva Explorar, Meus agendamentos, Notificações, Minha Conta e Sair no drawer', () => {
      mockDrawerVisible = true;
      mockDrawerOpen = true;

      renderShell();

      expect(screen.queryByText('Início')).toBeNull();
      expect(screen.getByRole('menuitem', { name: 'Explorar' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Meus agendamentos' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Notificações' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Minha Conta' })).toBeDefined();
      expect(screen.getByRole('menuitem', { name: 'Sair da Conta' })).toBeDefined();
    });

    it('não inclui a ação Agendar como rota dentro do drawer', () => {
      mockDrawerVisible = true;
      mockDrawerOpen = true;

      renderShell();

      // Agendar só deve estar na cápsula (1 vez no documento total)
      const agendarElements = screen.getAllByText('Agendar');
      expect(agendarElements.length).toBe(1);
    });

    it('fecha o drawer ao selecionar um item de navegação', () => {
      mockDrawerVisible = true;
      mockDrawerOpen = true;

      renderShell();

      const bookingsItem = screen.getByRole('menuitem', { name: 'Meus agendamentos' });
      fireEvent.click(bookingsItem);

      expect(mockCloseDrawer).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/(client)/bookings');
    });

    it('fecha o drawer ao pressionar Escape na web', () => {
      mockDrawerVisible = true;
      mockDrawerOpen = true;

      renderShell();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockCloseDrawer).toHaveBeenCalled();
    });
  });

  describe('ClientNavbarMetricsContext', () => {
    it('expõe métricas da navbar ao contexto interno', () => {
      let contextValue = 0;
      function TestConsumer() {
        contextValue = React.useContext(ClientNavbarMetricsContext);
        return <div>Altura da barra: {contextValue}</div>;
      }

      render(
        <ThemeProvider initialMode="dark">
          <ClientNavigationShell>
            <TestConsumer />
          </ClientNavigationShell>
        </ThemeProvider>,
      );

      // Deve ter um valor maior que zero (altura medida + bottom inset)
      expect(contextValue).toBeGreaterThan(0);
    });
  });
});
