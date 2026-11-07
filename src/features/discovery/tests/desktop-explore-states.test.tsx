// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { ExploreFeedView } from '../ui/ExploreFeedView';
import * as useExploreFeedModule from '../model/use-explore-feed';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/(client)/explore',
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

vi.mock('@/features/reviews/ui/BarbershopReviewsList', () => ({
  BarbershopReviewsList: () => <div data-testid="mock-reviews-list">Reviews</div>,
}));

vi.mock('@/features/services/model/use-public-services', () => ({
  usePublicServices: () => ({
    services: [],
    isLoading: false,
    selectedIds: [],
    toggleService: vi.fn(),
    isHandoffModalOpen: false,
    setIsHandoffModalOpen: vi.fn(),
    totalSelectedCents: 0,
    totalDurationMinutes: 0,
  }),
}));

describe('D6 — Estados de Loading, Erro e Vazio no Explorar Desktop', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('exibe skeleton estrutural de layout proporcional quando isLoading=true e itens vazios', () => {
    vi.spyOn(useExploreFeedModule, 'useExploreFeed').mockReturnValue({
      items: [],
      isLoading: true,
      isFetchingNextPage: false,
      hasNextPage: false,
      error: null,
      mode: 'ALL',
      radiusKm: 25,
      searchQuery: '',
      regionKey: '',
      setRegionKey: vi.fn(),
      locationSession: { state: 'idle', generationId: 'g1' } as any,
      isProximityUnavailable: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      setMode: vi.fn(),
      setRadius: vi.fn(),
      setSearchQuery: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView presentation="desktop" isVisible={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText('Carregando experiências do feed Explorar')).toBeDefined();
  });

  it('exibe feedback honesto de erro com botão de retry e ação para todas as regiões', () => {
    const mockRefetch = vi.fn();
    const mockSetMode = vi.fn();

    vi.spyOn(useExploreFeedModule, 'useExploreFeed').mockReturnValue({
      items: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      error: new Error('Falha de conexão com o servidor de descoberta'),
      mode: 'NEARBY',
      radiusKm: 25,
      searchQuery: '',
      regionKey: '',
      setRegionKey: vi.fn(),
      locationSession: { state: 'idle', generationId: 'g1' } as any,
      isProximityUnavailable: false,
      fetchNextPage: vi.fn(),
      refetch: mockRefetch,
      setMode: mockSetMode,
      setRadius: vi.fn(),
      setSearchQuery: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView presentation="desktop" isVisible={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Não foi possível carregar o feed')).toBeDefined();
    expect(screen.getByText('Falha de conexão com o servidor de descoberta')).toBeDefined();

    const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i });
    fireEvent.click(retryBtn);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    const allRegionsBtn = screen.getByRole('button', { name: /Ver todas as regiões/i });
    fireEvent.click(allRegionsBtn);
    expect(mockSetMode).toHaveBeenCalledWith('ALL');
  });

  it('exibe estado vazio honesto quando nenhuma barbearia é encontrada', () => {
    const mockSetRadius = vi.fn();

    vi.spyOn(useExploreFeedModule, 'useExploreFeed').mockReturnValue({
      items: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      error: null,
      mode: 'NEARBY',
      radiusKm: 25,
      searchQuery: '',
      regionKey: '',
      setRegionKey: vi.fn(),
      locationSession: { state: 'granted', generationId: 'g1' } as any,
      isProximityUnavailable: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      setMode: vi.fn(),
      setRadius: mockSetRadius,
      setSearchQuery: vi.fn(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView presentation="desktop" isVisible={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Nenhuma barbearia encontrada')).toBeDefined();
    expect(screen.getByText(/Não encontramos barbearias a menos de 25 km/i)).toBeDefined();

    const expandBtn = screen.getByRole('button', { name: /Expandir para 50 km/i });
    fireEvent.click(expandBtn);
    expect(mockSetRadius).toHaveBeenCalledWith(50);
  });
});
