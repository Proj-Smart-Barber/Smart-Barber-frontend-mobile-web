// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { ExploreFeedView } from '../ui/ExploreFeedView';
import * as useExploreFeedModule from '../model/use-explore-feed';
import type { ExploreFeedItem } from '../api/explore-feed.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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

const mockItems: ExploreFeedItem[] = [
  {
    barbershop: {
      id: 'shop-int-1',
      slug: 'barbearia-norte',
      name: 'Barbearia Norte',
      location: 'Santana, São Paulo',
      logoUrl: 'https://images.example.com/logo1.png',
      rating: 4.9,
      reviewCount: 95,
      googleMapsUrl: 'https://maps.google.com',
    },
    distanceMeters: 1000,
    distanceBasis: 'user',
    rankingScore: { score: 0.9, distanceComponent: 0.9, reputationComponent: 0.9, bayesRating: 4.85 },
    media: [
      {
        id: 'media-s1-1',
        kind: 'service',
        mediaId: 'asset-s1-1',
        serviceId: 'srv-1',
        url: 'https://images.example.com/s1-1.jpg',
        width: 1080,
        height: 1920,
        alt: 'Degradê Navalhado',
        category: 'corte',
        service: {
          id: 'srv-1',
          title: 'Degradê Navalhado',
          priceInCents: 6000,
          durationInMinutes: 40,
        },
      },
      {
        id: 'media-s1-2',
        kind: 'environment',
        mediaId: 'asset-s1-2',
        serviceId: null,
        url: 'https://images.example.com/s1-2.jpg',
        width: 1920,
        height: 1080,
        alt: 'Espaço Café da Barbearia',
        category: 'interior',
        service: null,
      },
    ],
  },
  {
    barbershop: {
      id: 'shop-int-2',
      slug: 'barbearia-sul',
      name: 'Barbearia Sul',
      location: 'Moema, São Paulo',
      logoUrl: 'https://images.example.com/logo2.png',
      rating: 4.7,
      reviewCount: 52,
      googleMapsUrl: 'https://maps.google.com',
    },
    distanceMeters: 2500,
    distanceBasis: 'user',
    rankingScore: { score: 0.8, distanceComponent: 0.8, reputationComponent: 0.8, bayesRating: 4.65 },
    media: [
      {
        id: 'media-s2-1',
        kind: 'service',
        mediaId: 'asset-s2-1',
        serviceId: 'srv-2',
        url: 'https://images.example.com/s2-1.jpg',
        width: 1080,
        height: 1920,
        alt: 'Barba Terapia com Toalha Quente',
        category: 'barba',
        service: {
          id: 'srv-2',
          title: 'Barba Terapia',
          priceInCents: 4500,
          durationInMinutes: 30,
        },
      },
    ],
  },
];

describe('D4 — ExploreFeedView Variante Desktop (Integração sem Duplicar Estado)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    vi.spyOn(useExploreFeedModule, 'useExploreFeed').mockReturnValue({
      items: mockItems,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      error: null,
      mode: 'ALL',
      radiusKm: 25,
      searchQuery: '',
      regionKey: '',
      setRegionKey: vi.fn(),
      locationSession: { state: 'granted', coords: null, generationId: 'gen-1' } as any,
      isProximityUnavailable: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      setMode: vi.fn(),
      setRadius: vi.fn(),
      setSearchQuery: vi.fn(),
    });
  });

  it('renderiza variante desktop quando presentation="desktop", exibindo controles e painel contextual', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView presentation="desktop" isVisible={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('desktop-shop-controls')).toBeDefined();
    expect(screen.getByTestId('desktop-media-controls')).toBeDefined();
    expect(screen.getByText('Barbearia Norte')).toBeDefined();
    expect(screen.getByText('Degradê Navalhado')).toBeDefined();
  });

  it('sincroniza o contexto de agendamento e aciona onRequestBooking ao clicar em Agendar no painel', async () => {
    const onActiveMediaChange = vi.fn();
    const onRequestBooking = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView
            presentation="desktop"
            isVisible={true}
            onActiveMediaChange={onActiveMediaChange}
            onRequestBooking={onRequestBooking}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const bookBtn = screen.getByRole('button', { name: /Agendar este serviço/i });
    expect(bookBtn).toBeDefined();

    fireEvent.click(bookBtn);

    expect(onActiveMediaChange).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 'shop-int-1',
        shopName: 'Barbearia Norte',
        mediaId: 'media-s1-1',
        service: expect.objectContaining({
          id: 'srv-1',
          title: 'Degradê Navalhado',
        }),
      }),
    );
    expect(onRequestBooking).toHaveBeenCalledTimes(1);
  });

  it('avança para a próxima barbearia mantendo sincronização de contexto', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView presentation="desktop" isVisible={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Barbearia Norte')).toBeDefined();

    const nextShopBtn = screen.getByRole('button', { name: /Próxima barbearia/i });
    fireEvent.click(nextShopBtn);

    await waitFor(() => {
      expect(screen.getByText('Barbearia Sul')).toBeDefined();
      expect(screen.getByText('Barba Terapia')).toBeDefined();
    });
  });

  it('desabilita controles e pausa interações quando interactionBlocked for verdadeiro', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView presentation="desktop" isVisible={true} interactionBlocked={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    const nextShopBtn = screen.getByRole('button', { name: /Próxima barbearia/i });
    expect(nextShopBtn.getAttribute('aria-disabled') === 'true' || (nextShopBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
