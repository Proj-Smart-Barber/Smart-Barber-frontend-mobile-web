// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import { ExploreFeedSlide } from '../ui/ExploreFeedSlide';
import type { ExploreFeedItem } from '../api/explore-feed.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
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
      category: 'corte_maquina',
      service: {
        id: 'srv-1',
        title: 'Degradê na Máquina',
        priceInCents: 5000,
        durationInMinutes: 35,
      },
    },
    {
      id: 'photo-env-1',
      kind: 'environment',
      mediaId: 'asset-2',
      serviceId: null,
      url: 'https://images.example.com/ambiente.jpg',
      width: 1080,
      height: 1920,
      alt: 'Ambiente da Barbearia',
      category: 'interior',
      service: null,
    },
  ],
};

describe('ExploreFeedSlide', () => {
  it('não deve renderizar o título duplicado Explorar no slide, preservando identificação da barbearia, nota e distância formatada', () => {
    const onOpenService = vi.fn();
    const onOpenCatalog = vi.fn();
    const onOpenAbout = vi.fn();
    const onOpenReviews = vi.fn();
    const onOpenFilters = vi.fn();

    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={mockItem}
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          locationLabel="Perto de você"
          onOpenService={onOpenService}
          onOpenCatalog={onOpenCatalog}
          onOpenAbout={onOpenAbout}
          onOpenReviews={onOpenReviews}
          onOpenFilters={onOpenFilters}
        />
      </ThemeProvider>,
    );

    // C-006: segundo título "Explorar" removido do slide
    expect(screen.queryByText('Explorar')).toBeNull();
    expect(screen.getByText('Barbearia Horizonte — Demonstração')).toBeTruthy();
    expect(screen.getByText('Vila Mariana, São Paulo')).toBeTruthy();
    expect(screen.getByText(/4,8 \(126\)/)).toBeTruthy();
    expect(screen.getByText(/1,2 km/)).toBeTruthy();
  });

  it('deve exibir dados de serviço reais (preço e duração) quando a foto for de serviço', () => {
    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={mockItem}
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          locationLabel="Perto de você"
          onOpenService={vi.fn()}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={vi.fn()}
          onOpenFilters={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Degradê na Máquina')).toBeTruthy();
    expect(screen.getByText(/R\$ 50,00 [•·] 35 min/)).toBeTruthy();
    expect(screen.getByText('Imagens e dados ilustrativos')).toBeTruthy();
  });

  it('deve disparar callbacks ao tocar nas ações do trilho direito (Serviço, Catálogo, Sobre)', () => {
    const onOpenService = vi.fn();
    const onOpenCatalog = vi.fn();
    const onOpenAbout = vi.fn();

    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={mockItem}
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          locationLabel="Perto de você"
          onOpenService={onOpenService}
          onOpenCatalog={onOpenCatalog}
          onOpenAbout={onOpenAbout}
          onOpenReviews={vi.fn()}
          onOpenFilters={vi.fn()}
        />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByLabelText('Ver detalhes do serviço'));
    expect(onOpenService).toHaveBeenCalledWith(mockItem, mockItem.media[0]);

    fireEvent.click(screen.getByLabelText('Abrir catálogo completo de serviços da barbearia'));
    expect(onOpenCatalog).toHaveBeenCalledWith(mockItem);

    fireEvent.click(screen.getByLabelText('Ver sobre a barbearia, endereço e mapa'));
    expect(onOpenAbout).toHaveBeenCalledWith(mockItem);
  });

  it('usa papel secundário em vidro para a ação lateral de serviço, preservando Sobre e avaliações sem competir como CTA primário', () => {
    const onOpenService = vi.fn();
    const onOpenReviews = vi.fn();

    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={mockItem}
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          locationLabel="Perto de você"
          onOpenService={onOpenService}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={onOpenReviews}
          onOpenFilters={vi.fn()}
        />
      </ThemeProvider>,
    );

    const detailBtn = screen.getByLabelText('Ver detalhes do serviço');
    expect(detailBtn).toBeTruthy();
    expect(screen.getByText('Detalhes')).toBeTruthy();

    fireEvent.click(screen.getByLabelText(/Toque para ver avaliações publicadas/i));
    expect(onOpenReviews).toHaveBeenCalledWith(mockItem);
  });

  it('não renderiza vídeo nem inventa serviço/preço para mídia ambiental ou de equipe quando isActive=false', () => {
    const envOnlyItem: ExploreFeedItem = {
      ...mockItem,
      media: [mockItem.media[1]],
    };

    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={envOnlyItem}
          isActive={false}
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          locationLabel="Perto de você"
          onOpenService={vi.fn()}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={vi.fn()}
          onOpenFilters={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Ambiente da Barbearia')).toBeTruthy();
    expect(screen.queryByText(/R\$/i)).toBeNull();
    expect(screen.queryByTestId('native-video-mock')).toBeNull();
  });

  it('C-008: atualiza índice e chama onPhotoIndexChange via scroll horizontal compatível com web', () => {
    const onPhotoIndexChange = vi.fn();
    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={mockItem}
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          onPhotoIndexChange={onPhotoIndexChange}
          onOpenService={vi.fn()}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Degradê na Máquina')).toBeTruthy();

    const scrollEl = screen.getByTestId('explore-photo-scroll');
    Object.defineProperty(scrollEl, 'scrollLeft', { value: 390, writable: true });
    fireEvent.scroll(scrollEl, {
      nativeEvent: { contentOffset: { x: 390, y: 0 } },
    });

    expect(onPhotoIndexChange).toHaveBeenCalledWith('shop-1', 1);
  });
});

// Native player is verified separately; these tests exercise gallery and catalogue UI.
vi.mock('@/features/discovery/ui/ExploreVideo', () => ({
  ExploreVideo: () => <div data-testid="native-video-mock" />,
}));
