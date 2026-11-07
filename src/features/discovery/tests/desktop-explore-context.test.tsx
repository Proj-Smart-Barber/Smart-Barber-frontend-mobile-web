// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import { DesktopExploreContext } from '../ui/desktop-explore-context';
import type { ExploreFeedItem, ExploreFeedMediaItem } from '../api/explore-feed.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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

const mockShopItem: ExploreFeedItem = {
  barbershop: {
    id: 'shop-desk-context-1',
    slug: 'barbearia-vintage-deluxe',
    name: 'Barbearia Vintage Deluxe com Nome Longo e Elegante',
    location: 'Jardins, São Paulo — SP',
    logoUrl: 'https://images.example.com/shop-logo.png',
    rating: 4.85,
    reviewCount: 142,
    googleMapsUrl: 'https://maps.google.com',
  },
  distanceMeters: 1500,
  distanceBasis: 'user',
  rankingScore: {
    score: 0.9,
    distanceComponent: 0.8,
    reputationComponent: 0.95,
    bayesRating: 4.8,
  },
  media: [],
};

const serviceMedia: ExploreFeedMediaItem = {
  id: 'media-srv-1',
  kind: 'service',
  mediaId: 'asset-srv-1',
  serviceId: 'srv-101',
  url: 'https://images.example.com/corte.jpg',
  width: 1080,
  height: 1920,
  alt: 'Degradê Navalhado com Textura',
  category: 'corte',
  service: {
    id: 'srv-101',
    title: 'Degradê Navalhado Premium',
    priceInCents: 7500,
    durationInMinutes: 45,
  },
};

const environmentMedia: ExploreFeedMediaItem = {
  id: 'media-env-1',
  kind: 'environment',
  mediaId: 'asset-env-1',
  serviceId: null,
  url: 'https://images.example.com/interior.jpg',
  width: 1920,
  height: 1080,
  alt: 'Lounge e Bar da Barbearia',
  category: 'interior',
  service: null,
};

describe('D3 — DesktopExploreContext (Painel Contextual e de Agendamento)', () => {
  it('exibe nome da unidade, localização e avaliação real', () => {
    render(
      <ThemeProvider>
        <DesktopExploreContext
          item={mockShopItem}
          media={serviceMedia}
          onBook={vi.fn()}
          onCatalog={vi.fn()}
          onAbout={vi.fn()}
          onReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Barbearia Vintage Deluxe com Nome Longo e Elegante')).toBeDefined();
    expect(screen.getByText('Jardins, São Paulo — SP')).toBeDefined();
    expect(screen.getByText(/4,8 \(142\)/)).toBeDefined();
    expect(screen.getByText(/1,5 km/)).toBeDefined();
  });

  it('exibe "Sem avaliações" honesto quando rating for nulo ou ausente', () => {
    const itemWithoutRating: ExploreFeedItem = {
      ...mockShopItem,
      barbershop: {
        ...mockShopItem.barbershop,
        rating: null,
        reviewCount: 0,
      },
    };

    render(
      <ThemeProvider>
        <DesktopExploreContext
          item={itemWithoutRating}
          media={serviceMedia}
          onBook={vi.fn()}
          onCatalog={vi.fn()}
          onAbout={vi.fn()}
          onReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Sem avaliações')).toBeDefined();
  });

  it('diferencia distância pessoal de distância referencial da região', () => {
    const regionDistanceItem: ExploreFeedItem = {
      ...mockShopItem,
      distanceBasis: 'region',
      distanceMeters: 3200,
    };

    render(
      <ThemeProvider>
        <DesktopExploreContext
          item={regionDistanceItem}
          media={serviceMedia}
          onBook={vi.fn()}
          onCatalog={vi.fn()}
          onAbout={vi.fn()}
          onReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(/3,2 km da região/i)).toBeDefined();
  });

  it('exibe serviço vinculado, preço e duração, e ação primária "Agendar este serviço"', () => {
    const onBook = vi.fn();

    render(
      <ThemeProvider>
        <DesktopExploreContext
          item={mockShopItem}
          media={serviceMedia}
          onBook={onBook}
          onCatalog={vi.fn()}
          onAbout={vi.fn()}
          onReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Degradê Navalhado Premium')).toBeDefined();
    expect(screen.getByText(/R\$ 75,00/)).toBeDefined();
    expect(screen.getByText(/45 min/)).toBeDefined();

    const bookButton = screen.getByRole('button', { name: /Agendar este serviço/i });
    expect(bookButton).toBeDefined();

    fireEvent.click(bookButton);
    expect(onBook).toHaveBeenCalledWith(mockShopItem, serviceMedia);
  });

  it('para mídia de ambiente, não inventa preço/serviço e conduz para catálogo', () => {
    const onCatalog = vi.fn();

    render(
      <ThemeProvider>
        <DesktopExploreContext
          item={mockShopItem}
          media={environmentMedia}
          onBook={vi.fn()}
          onCatalog={onCatalog}
          onAbout={vi.fn()}
          onReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Ambiente da Barbearia')).toBeDefined();
    expect(screen.getByText('Estrutura e instalações do espaço')).toBeDefined();
    expect(screen.queryByText(/R\$/)).toBeNull();

    const actionButton = screen.getByRole('button', { name: /Ver serviços e agendar/i });
    expect(actionButton).toBeDefined();

    fireEvent.click(actionButton);
    expect(onCatalog).toHaveBeenCalledWith(mockShopItem);
  });

  it('quando sem mídia ativa, orienta para o catálogo sem fabricar serviço', () => {
    const onCatalog = vi.fn();

    render(
      <ThemeProvider>
        <DesktopExploreContext
          item={mockShopItem}
          media={null}
          onBook={vi.fn()}
          onCatalog={onCatalog}
          onAbout={vi.fn()}
          onReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Explore o catálogo completo de serviços/i)).toBeDefined();
    const actionButton = screen.getByRole('button', { name: /Ver serviços e agendar/i });
    fireEvent.click(actionButton);
    expect(onCatalog).toHaveBeenCalledWith(mockShopItem);
  });

  it('aciona ações secundárias: Ver serviços, Sobre e Avaliações', () => {
    const onCatalog = vi.fn();
    const onAbout = vi.fn();
    const onReviews = vi.fn();

    render(
      <ThemeProvider>
        <DesktopExploreContext
          item={mockShopItem}
          media={serviceMedia}
          onBook={vi.fn()}
          onCatalog={onCatalog}
          onAbout={onAbout}
          onReviews={onReviews}
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Ver todos os serviços/i }));
    expect(onCatalog).toHaveBeenCalledWith(mockShopItem);

    fireEvent.click(screen.getByRole('button', { name: /Sobre a barbearia/i }));
    expect(onAbout).toHaveBeenCalledWith(mockShopItem);

    fireEvent.click(screen.getByRole('button', { name: /Ver avaliações/i }));
    expect(onReviews).toHaveBeenCalledWith(mockShopItem);
  });
});
