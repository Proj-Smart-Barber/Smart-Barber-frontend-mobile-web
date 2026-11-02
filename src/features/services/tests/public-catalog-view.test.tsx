// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Linking } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { PublicCatalogView } from '../ui/PublicCatalogView';

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockCanGoBack = vi.fn().mockReturnValue(true);

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useLocalSearchParams: () => ({ shopId: 'shop-estacao' }),
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

const mockServices = [
  {
    id: 'srv-1',
    barbershopId: 'shop-estacao',
    title: 'Corte Tradicional',
    description: 'Corte na tesoura e máquina',
    priceInCents: 5000,
    durationInMinutes: 35,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'srv-2',
    barbershopId: 'shop-estacao',
    title: 'Barba Terapia',
    description: 'Toalha quente e alinhamento',
    priceInCents: 3500,
    durationInMinutes: 25,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

vi.mock('../model/use-public-services', () => ({
  usePublicServices: (shopId: string) => ({
    barbershop: {
      id: shopId,
      name: 'Barbearia Estação — Demonstração',
      location: 'Rua Visconde de Parnaíba, 1316 - Mooca, São Paulo - SP',
      avatarUrl: 'https://smartbarber.local/avatar-estacao.png',
      coverUrl: 'https://smartbarber.local/cover-estacao.png',
      googleMapsUrl: 'https://maps.google.com/?q=Barbearia+Estacao',
    },
    services: mockServices,
    isLoading: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(),
    selectedServices: [],
    totalPriceInCents: 0,
    totalDurationInMinutes: 0,
    toggleService: vi.fn(),
    isSelected: vi.fn().mockReturnValue(false),
    clearSelection: vi.fn(),
    isHandoffModalOpen: false,
    openHandoffModal: vi.fn(),
    closeHandoffModal: vi.fn(),
  }),
}));

vi.mock('@/features/media', () => ({
  mediaApi: {
    getBarbershopGallery: vi.fn().mockResolvedValue([
      { id: 'gal-1', publicUrl: 'https://smartbarber.local/gal-1.png' },
      { id: 'gal-2', publicUrl: 'https://smartbarber.local/gal-2.png' },
    ]),
  },
  BarbershopGalleryViewer: ({ barbershopId }: any) => (
    <div data-testid="gallery-viewer">Galeria do Espaço ({barbershopId})</div>
  ),
}));

vi.mock('@/features/reviews', () => ({
  useBarbershopReviews: () => ({
    data: {
      averageRating: 5.0,
      reviewCount: 3,
      reviews: [],
    },
    isLoading: false,
    error: null,
  }),
  BarbershopReviewsList: ({ barbershopId }: any) => (
    <div data-testid="reviews-list">Avaliações ({barbershopId})</div>
  ),
}));

function renderWithTheme(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialMode="dark">{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('PublicCatalogView - Redesenho Completo de UI/UX Pro Max', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o botão de voltar e executa navegação ao ser acionado', () => {
    renderWithTheme(<PublicCatalogView barbershopId="shop-estacao" />);

    const backButton = screen.getByRole('button', { name: /Voltar para a página anterior/i });
    expect(backButton).toBeDefined();

    fireEvent.click(backButton);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renderiza o cabeçalho com nome, logo, endereço e nota da barbearia', () => {
    renderWithTheme(<PublicCatalogView barbershopId="shop-estacao" />);

    expect(screen.getByText('Barbearia Estação — Demonstração')).toBeDefined();
    expect(
      screen.getByText('Rua Visconde de Parnaíba, 1316 - Mooca, São Paulo - SP'),
    ).toBeDefined();
    expect(screen.getByText('5.0')).toBeDefined();
    expect(screen.getByText('(3 avaliações)')).toBeDefined();
  });

  it('renderiza o botão de GPS e aciona o aplicativo de mapas ao clicar', () => {
    const spyOpenUrl = vi.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    renderWithTheme(<PublicCatalogView barbershopId="shop-estacao" />);

    const gpsButton = screen.getByRole('button', { name: /Abrir rota para a barbearia/i });
    expect(gpsButton).toBeDefined();

    fireEvent.click(gpsButton);
    expect(spyOpenUrl).toHaveBeenCalledWith('https://maps.google.com/?q=Barbearia+Estacao');
  });

  it('posiciona serviços, galeria do espaço e avaliações na ordem solicitada (avaliações por último)', async () => {
    renderWithTheme(<PublicCatalogView barbershopId="shop-estacao" />);

    expect(screen.getByText('Serviços Disponíveis')).toBeDefined();
    expect(screen.getByText('Corte Tradicional')).toBeDefined();
    expect(screen.getByText('Barba Terapia')).toBeDefined();

    const galleryElement = await screen.findByTestId('gallery-viewer');
    const reviewsElement = screen.getByTestId('reviews-list');

    expect(galleryElement).toBeDefined();
    expect(reviewsElement).toBeDefined();

    // Comprova que as avaliações aparecem após a galeria no DOM
    const isReviewsAfterGallery =
      galleryElement.compareDocumentPosition(reviewsElement) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(Boolean(isReviewsAfterGallery)).toBe(true);
  });
});

// Native player is verified separately; these tests exercise gallery and catalogue UI.
vi.mock('@/features/discovery/ui/ExploreVideo', () => ({
  ExploreVideo: () => <div data-testid="native-video-mock" />,
}));
