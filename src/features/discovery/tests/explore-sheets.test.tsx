// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import {
  ExploreServiceSheet,
  ExploreAboutSheet,
  ExploreFilterSheet,
} from '../ui/ExploreSheets';
import type { ExploreFeedItem } from '../api/explore-feed.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('@/features/reviews/ui/BarbershopReviewsList', () => ({
  BarbershopReviewsList: () => <div data-testid="mock-reviews-list">Reviews</div>,
}));

vi.mock('@/features/services/model/use-public-services', () => ({
  usePublicServices: () => ({
    services: [
      {
        id: 'srv-1',
        barbershopId: 'shop-1',
        title: 'Corte Tradicional',
        description: 'Corte tesoura e máquina',
        priceInCents: 5000,
        durationInMinutes: 35,
        isActive: true,
      },
    ],
    isLoading: false,
    selectedIds: [],
    toggleService: vi.fn(),
    isHandoffModalOpen: false,
    setIsHandoffModalOpen: vi.fn(),
    totalSelectedCents: 0,
    totalDurationMinutes: 0,
  }),
}));

const mockItem: ExploreFeedItem = {
  barbershop: {
    id: 'shop-1',
    slug: 'barbearia-horizonte-demo',
    name: 'Barbearia Horizonte — Demonstração',
    location: 'Vila Mariana, São Paulo',
    logoUrl: 'https://images.example.com/logo.png',
    rating: 4.8,
    reviewCount: 126,
    googleMapsUrl: 'https://maps.google.com',
  },
  distanceMeters: 1200,
  distanceBasis: 'user',
  rankingScore: {
    score: 0.85,
    distanceComponent: 0.7,
    reputationComponent: 0.9,
    bayesRating: 4.75,
  },
  media: [
    {
      id: 'photo-srv-1',
      kind: 'service',
      mediaId: 'asset-1',
      serviceId: 'srv-1',
      url: 'https://images.example.com/corte.jpg',
      width: 1080,
      height: 1920,
      alt: 'Degradê na Máquina',
      service: {
        id: 'srv-1',
        title: 'Degradê na Máquina',
        priceInCents: 5000,
        durationInMinutes: 35,
      },
    },
  ],
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('ExploreSheets', () => {
  it('ExploreServiceSheet deve exibir dados e botão de agendamento', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ExploreServiceSheet
        visible={true}
        item={mockItem}
        activeMedia={mockItem.media[0]}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Degradê na Máquina')).toBeTruthy();
    expect(screen.getByText('R$ 50,00')).toBeTruthy();
    expect(screen.getByText(/35 min/)).toBeTruthy();
    expect(screen.getByText('Agendar este serviço')).toBeTruthy();
  });

  it('remove a camada do painel na web mesmo sem evento de fim da animação', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ThemeProvider>
        <ExploreAboutSheet visible item={mockItem} onClose={onClose} />
      </ThemeProvider>,
    );

    expect(screen.getByText('Como chegar (Abrir no GPS / Maps)')).toBeTruthy();

    rerender(
      <ThemeProvider>
        <ExploreAboutSheet visible={false} item={mockItem} onClose={onClose} />
      </ThemeProvider>,
    );

    expect(screen.queryByText('Como chegar (Abrir no GPS / Maps)')).toBeNull();
  });

  it('ExploreAboutSheet deve exibir endereço e botão para abrir Maps', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <ExploreAboutSheet visible={true} item={mockItem} onClose={onClose} />,
    );

    expect(screen.getByText('Vila Mariana, São Paulo')).toBeTruthy();
    expect(screen.getByText('Como chegar (Abrir no GPS / Maps)')).toBeTruthy();
  });

  it('ExploreFilterSheet deve permitir trocar modo e aplicar filtros', () => {
    const onClose = vi.fn();
    const onApplyFilters = vi.fn();

    renderWithProviders(
      <ExploreFilterSheet
        visible={true}
        mode="NEARBY"
        radiusKm={10}
        searchQuery=""
        isLocationGranted={true}
        onClose={onClose}
        onApplyFilters={onApplyFilters}
      />,
    );

    expect(screen.getByText('Personalizar Busca')).toBeTruthy();
    expect(screen.getByText('📍 Perto de mim')).toBeTruthy();
    expect(screen.getByText('🌐 Todas as barbearias')).toBeTruthy();

    fireEvent.click(screen.getByText('🌐 Todas as barbearias'));
    fireEvent.click(screen.getByText('Aplicar Filtros'));

    expect(onApplyFilters).toHaveBeenCalledWith('ALL', 10, '');
    expect(onClose).toHaveBeenCalled();
  });
});
