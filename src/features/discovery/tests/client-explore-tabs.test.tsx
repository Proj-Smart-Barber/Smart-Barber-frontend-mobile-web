// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import {
  ClientExploreTabs,
  resolveClientExploreSection,
  type ClientExploreSection,
} from '../ui/client-explore-tabs';
import ClientExploreScreen from '@/app/(client)/explore';
import ClientHomeScreen from '@/app/(client)/index';
import ClientBookingsScreen from '@/app/(client)/bookings';
import { ClientExperienceProvider } from '../model/client-experience-context';
import { exploreFeedApi } from '../api/explore-feed.api';
import { discoveryApi } from '../api/discovery.api';

const mockPush = vi.fn();
const mockSetParams = vi.fn();
let mockSearchParams: Record<string, any> = {};
let mockPathname = '/(client)/explore';

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    setParams: mockSetParams,
    replace: vi.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
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

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('@/features/auth', () => ({
  useSession: () => ({
    status: 'authenticated',
    identity: { id: 'client-1', name: 'Cliente Teste' },
  }),
}));

vi.mock('@/features/bookings', () => ({
  useMyBookings: () => ({
    bookings: [],
    upcoming: [],
    past: [],
    nextBooking: null,
    isLoading: false,
    isFetchingNextPage: false,
    hasMore: false,
    loadNextPage: vi.fn(),
    error: null,
    refetch: vi.fn(),
    isRefetching: false,
  }),
  ClientBookingsSkeleton: () => <div data-testid="bookings-skeleton" />,
}));

function renderTabs(active: ClientExploreSection, onSelect = vi.fn()) {
  return render(
    <ThemeProvider initialMode="dark">
      <ClientExploreTabs active={active} onSelect={onSelect} />
    </ThemeProvider>,
  );
}

describe('ClientExploreTabs — Tarefa 5: Abas Superiores de Descoberta', () => {
  it('renderiza exatamente os três acessos com rótulos completos: Explorar, Perto de você, Meus agendamentos', () => {
    renderTabs('feed');

    const tablist = screen.getByRole('tablist', { name: /Seções de descoberta/i });
    expect(tablist).toBeTruthy();

    const feedTab = screen.getByRole('tab', { name: /^Explorar$/i });
    const nearbyTab = screen.getByRole('tab', { name: /^Perto de você$/i });
    const bookingsTab = screen.getByRole('tab', { name: /^Meus agendamentos$/i });

    expect(feedTab).toBeTruthy();
    expect(nearbyTab).toBeTruthy();
    expect(bookingsTab).toBeTruthy();

    expect(feedTab.getAttribute('aria-selected')).toBe('true');
    expect(nearbyTab.getAttribute('aria-selected')).toBe('false');
    expect(bookingsTab.getAttribute('aria-selected')).toBe('false');
  });

  it('marca Perto de você como selecionado quando active="nearby" e Meus agendamentos quando active="bookings"', () => {
    const { rerender } = render(
      <ThemeProvider initialMode="dark">
        <ClientExploreTabs active="nearby" onSelect={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('tab', { name: /^Perto de você$/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /^Explorar$/i }).getAttribute('aria-selected')).toBe('false');

    rerender(
      <ThemeProvider initialMode="dark">
        <ClientExploreTabs active="bookings" onSelect={vi.fn()} />
      </ThemeProvider>,
    );

    expect(screen.getByRole('tab', { name: /^Meus agendamentos$/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: /^Perto de você$/i }).getAttribute('aria-selected')).toBe('false');
  });

  it('aciona onSelect apenas quando o usuário toca em uma aba diferente da ativa (não empilha repetidamente a mesma rota)', () => {
    const onSelect = vi.fn();
    renderTabs('feed', onSelect);

    // Tocar na aba já ativa ('feed') não dispara navegação redundante
    fireEvent.click(screen.getByRole('tab', { name: /^Explorar$/i }));
    expect(onSelect).not.toHaveBeenCalled();

    // Tocar em 'Perto de você' dispara onSelect('nearby')
    fireEvent.click(screen.getByRole('tab', { name: /^Perto de você$/i }));
    expect(onSelect).toHaveBeenCalledWith('nearby');

    // Tocar em 'Meus agendamentos' dispara onSelect('bookings')
    fireEvent.click(screen.getByRole('tab', { name: /^Meus agendamentos$/i }));
    expect(onSelect).toHaveBeenCalledWith('bookings');
  });

  it('resolve parâmetros de URL com segurança: section=nearby vai para nearby e qualquer valor inválido/ausente retorna ao feed', () => {
    expect(resolveClientExploreSection(undefined)).toBe('feed');
    expect(resolveClientExploreSection(null)).toBe('feed');
    expect(resolveClientExploreSection('')).toBe('feed');
    expect(resolveClientExploreSection('feed')).toBe('feed');
    expect(resolveClientExploreSection('nearby')).toBe('nearby');
    expect(resolveClientExploreSection(['nearby'])).toBe('nearby');
    expect(resolveClientExploreSection('invalid-value')).toBe('feed');
    expect(resolveClientExploreSection('bookings')).toBe('feed');
  });

  describe('Integração nas rotas explore, bookings e preservação de Início', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockSearchParams = {};
      mockPathname = '/(client)/explore';
    });

    it('não monta nem carrega o feed se a primeira entrada for diretamente em section=nearby', () => {
      mockSearchParams = { section: 'nearby' };
      const feedSpy = vi.spyOn(exploreFeedApi, 'getFeed');
      vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        hasNext: false,
        serverTime: '2026-11-06T12:00:00Z',
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <ClientExperienceProvider actorId="client-1">
              <ClientExploreScreen />
            </ClientExperienceProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByRole('tab', { name: /^Perto de você$/i }).getAttribute('aria-selected')).toBe('true');
      expect(feedSpy).not.toHaveBeenCalled();
    });

    it('preserva a instância do feed após a primeira abertura ao alternar entre Explorar e Perto de você', async () => {
      mockSearchParams = {};
      const feedSpy = vi.spyOn(exploreFeedApi, 'getFeed').mockResolvedValue({
        items: [
          {
            barbershop: {
              id: 'shop-persisted',
              slug: 'barbearia-persistida',
              name: 'Barbearia Persistida no Feed',
              location: 'Pinheiros, São Paulo',
              logoUrl: null,
              rating: 4.8,
              reviewCount: 10,
              googleMapsUrl: null,
            },
            distanceMeters: 400,
            distanceBasis: 'user',
            rankingScore: {
              score: 0.9,
              distanceComponent: 0.8,
              reputationComponent: 0.95,
              bayesRating: 4.7,
            },
            media: [
              {
                id: 'm-persisted',
                kind: 'service',
                mediaId: 'asset-p',
                serviceId: 'srv-p',
                url: 'https://images.example.com/p.jpg',
                width: 1080,
                height: 1920,
                alt: 'Corte',
                service: {
                  id: 'srv-p',
                  title: 'Corte Persistido',
                  priceInCents: 5000,
                  durationInMinutes: 30,
                },
              },
            ],
          },
        ],
        nextCursor: null,
        hasNext: false,
        total: 1,
        rankingVersion: 'v1',
        snapshotExpiresAt: new Date().toISOString(),
      });

      vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        hasNext: false,
        serverTime: '2026-11-06T12:00:00Z',
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <ClientExperienceProvider actorId="client-1">
              <ClientExploreScreen />
            </ClientExperienceProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      expect(await screen.findByText('Barbearia Persistida no Feed')).toBeTruthy();
      expect(feedSpy).toHaveBeenCalledTimes(1);

      // Alterna para Perto de você
      fireEvent.click(screen.getByRole('tab', { name: /^Perto de você$/i }));
      expect(mockSetParams).toHaveBeenCalledWith({ section: 'nearby' });

      mockSearchParams = { section: 'nearby' };
      rerender(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <ClientExperienceProvider actorId="client-1">
              <ClientExploreScreen />
            </ClientExperienceProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      // O painel de proximidade aparece e o feed continua montado em camada oculta (sem nova requisição de montagem)
      expect(screen.getByLabelText(/Buscar barbearia por nome ou bairro/i)).toBeTruthy();
      expect(feedSpy).toHaveBeenCalledTimes(1);

      // Retorna para Explorar
      mockSearchParams = { section: 'feed' };
      rerender(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <ClientExperienceProvider actorId="client-1">
              <ClientExploreScreen />
            </ClientExperienceProvider>
          </ThemeProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByText('Barbearia Persistida no Feed')).toBeTruthy();
      expect(feedSpy).toHaveBeenCalledTimes(1);
    });

    it('inclui ClientExploreTabs no cabeçalho da rota bookings com Meus agendamentos selecionado', () => {
      mockPathname = '/(client)/bookings';
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <ClientBookingsScreen />
          </ThemeProvider>
        </QueryClientProvider>,
      );

      const bookingsTab = screen.getByRole('tab', { name: /^Meus agendamentos$/i });
      expect(bookingsTab.getAttribute('aria-selected')).toBe('true');

      fireEvent.click(screen.getByRole('tab', { name: /^Perto de você$/i }));
      expect(mockPush).toHaveBeenCalledWith('/(client)/explore?section=nearby');
    });

    it('preserva a página Início sem adicionar ClientExploreTabs', () => {
      mockPathname = '/(client)';
      vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
        hasNext: false,
        serverTime: '2026-11-06T12:00:00Z',
      });
      vi.spyOn(discoveryApi, 'fetchUpcomingBooking').mockResolvedValue({
        booking: null,
        serverTime: '2026-11-06T12:00:00Z',
      });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="dark">
            <ClientHomeScreen />
          </ThemeProvider>
        </QueryClientProvider>,
      );

      expect(screen.queryByRole('tablist', { name: /Seções de descoberta/i })).toBeNull();
    });
  });
});
