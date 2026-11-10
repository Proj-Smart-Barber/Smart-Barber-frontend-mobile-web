// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import {
  ExploreFeedSlide,
  type ExploreFeedSlideHandle,
} from '../ui/ExploreFeedSlide';
import { ExploreVideo } from '../ui/ExploreVideo';
import type { ExploreFeedItem } from '../api/explore-feed.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('@/shared/ui', () => ({ Text: ({ children }: React.PropsWithChildren) => <span>{children}</span> }));

const mockVideoPlayer = {
  play: vi.fn(),
  pause: vi.fn(),
  addListener: vi.fn(() => ({ remove: vi.fn() })),
};

vi.mock('expo-video', () => ({
  useVideoPlayer: () => mockVideoPlayer,
  VideoView: ({ playsInline }: { playsInline?: boolean }) => <video playsInline={playsInline} />,
}));

const mockItem: ExploreFeedItem = {
  barbershop: {
    id: 'shop-desk-1',
    slug: 'barbearia-classic-desk',
    name: 'Barbearia Classic Desktop',
    location: 'Pinheiros, São Paulo',
    logoUrl: 'https://images.example.com/logo.png',
    rating: 4.9,
    reviewCount: 88,
    googleMapsUrl: 'https://maps.google.com',
  },
  distanceMeters: 800,
  distanceBasis: 'user',
  rankingScore: {
    score: 0.9,
    distanceComponent: 0.85,
    reputationComponent: 0.95,
    bayesRating: 4.88,
  },
  media: [
    {
      id: 'photo-1',
      kind: 'service',
      mediaId: 'asset-1',
      serviceId: 'srv-1',
      url: 'https://images.example.com/photo-1.jpg',
      width: 1080,
      height: 1920,
      alt: 'Corte Undercut Moderno',
      category: 'corte',
      service: {
        id: 'srv-1',
        title: 'Corte Undercut',
        priceInCents: 6500,
        durationInMinutes: 40,
      },
    },
    {
      id: 'photo-2',
      kind: 'environment',
      mediaId: 'asset-2',
      serviceId: null,
      url: 'https://images.example.com/photo-2.jpg',
      width: 1920,
      height: 1080,
      alt: 'Poltronas de Couro',
      category: 'interior',
      service: null,
    },
    {
      id: 'video-1',
      kind: 'service',
      mediaId: 'asset-3',
      serviceId: 'srv-1',
      url: 'https://videos.example.com/corte.mp4',
      posterUrl: 'https://images.example.com/poster.jpg',
      mimeType: 'video/mp4',
      width: 1080,
      height: 1920,
      alt: 'Vídeo Finalização do Corte',
      category: 'corte',
      service: {
        id: 'srv-1',
        title: 'Corte Undercut',
        priceInCents: 6500,
        durationInMinutes: 40,
      },
    },
  ],
};

describe('D2 — ExploreFeedSlide & ExploreVideo (Mídia Proporcional e Controle Compatível)', () => {
  it('solicita reprodução inline para o vídeo do feed', () => {
    const { container } = render(
      <ThemeProvider>
        <ExploreVideo url="/fixture.mp4" active />
      </ThemeProvider>,
    );

    expect(container.querySelector('video')?.hasAttribute('playsinline')).toBe(true);
  });

  it('no modo desktop, renderiza a mídia limpa sem sobrepor caption mobile ou action rail', () => {
    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={mockItem}
          presentation="desktop"
          width={450}
          height={800}
          bottomInset={0}
          topInset={0}
          onOpenService={vi.fn()}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    // No desktop, legendas e botões do mobile NÃO são renderizados sobre o frame de mídia
    expect(screen.queryByLabelText('Ver detalhes do serviço')).toBeNull();
    expect(screen.queryByLabelText('Abrir catálogo completo de serviços da barbearia')).toBeNull();
    expect(screen.queryByLabelText(/Toque para ver avaliações publicadas/i)).toBeNull();

    // A mídia é renderizada dentro do ScrollView
    const scroll = screen.getByTestId('explore-photo-scroll');
    expect(scroll).toBeDefined();

    const img = screen.getByLabelText('Corte Undercut Moderno');
    expect(img).toBeDefined();
    // No desktop o mediaFit padrão é contain
    expect(img.getAttribute('resizeMode') ?? img.getAttribute('style')).toBeDefined();
  });

  it('permite controle externo via handle scrollToMedia e notifica onPhotoIndexChange', () => {
    const handleRef = React.createRef<ExploreFeedSlideHandle>();
    const onPhotoIndexChange = vi.fn();

    render(
      <ThemeProvider>
        <ExploreFeedSlide
          ref={handleRef}
          item={mockItem}
          presentation="desktop"
          width={450}
          height={800}
          bottomInset={0}
          topInset={0}
          onPhotoIndexChange={onPhotoIndexChange}
          onOpenService={vi.fn()}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(handleRef.current).toBeDefined();
    expect(typeof handleRef.current?.scrollToMedia).toBe('function');

    // Aciona scrollToMedia para o índice 1
    handleRef.current?.scrollToMedia(1);

    expect(onPhotoIndexChange).toHaveBeenCalledWith('shop-desk-1', 1);
  });

  it('mantém apresentação immersive (mobile) intacta com overlays e rail por padrão', () => {
    render(
      <ThemeProvider>
        <ExploreFeedSlide
          item={mockItem}
          // presentation default = 'immersive'
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          onOpenService={vi.fn()}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={vi.fn()}
        />
      </ThemeProvider>,
    );

    // Overlays móveis continuam presentes no default
    expect(screen.getByLabelText('Ver detalhes do serviço')).toBeDefined();
    expect(screen.getByLabelText('Abrir catálogo completo de serviços da barbearia')).toBeDefined();
    expect(screen.getByText('Barbearia Classic Desktop')).toBeDefined();
  });
});
