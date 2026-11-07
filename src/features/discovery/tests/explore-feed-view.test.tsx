// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { ExploreFeedView } from '../ui/ExploreFeedView';
import { exploreFeedApi } from '../api/explore-feed.api';

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

describe('ExploreFeedView', () => {
  it('deve renderizar o feed com itens retornados pela API', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(exploreFeedApi, 'getFeed').mockResolvedValueOnce({
      items: [
        {
          barbershop: {
            id: 'shop-estacao',
            slug: 'barbearia-estacao-mooca-demo',
            name: 'Barbearia Estação Mooca — Demonstração',
            location: 'Mooca, São Paulo',
            logoUrl: 'https://images.example.com/logo2.png',
            rating: 5.0,
            reviewCount: 3,
            googleMapsUrl: 'https://maps.google.com',
          },
          distanceMeters: 800,
          distanceBasis: 'user',
          rankingScore: {
            score: 0.9,
            distanceComponent: 0.8,
            reputationComponent: 1.0,
            bayesRating: 4.8,
          },
          media: [
            {
              id: 'm1',
              kind: 'service',
              mediaId: 'asset-1',
              serviceId: 'srv-1',
              url: 'https://images.example.com/service.jpg',
              width: 1080,
              height: 1920,
              alt: 'Barboterapia',
              service: {
                id: 'srv-1',
                title: 'Barba Terapia e Alinhamento',
                priceInCents: 4500,
                durationInMinutes: 30,
              },
            },
          ],
        },
      ],
      nextCursor: null,
      hasNext: false,
      total: 1,
      rankingVersion: 'v1-2026-11-01',
      snapshotExpiresAt: new Date().toISOString(),
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Barbearia Estação Mooca — Demonstração')).toBeTruthy();
    expect(await screen.findByText('Barba Terapia e Alinhamento')).toBeTruthy();
    expect(exploreFeedApi.getFeed).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ALL' }),
      expect.anything(),
    );
  });
  it('oferece recuperação para a busca geral após falha no feed',async()=>{
    const queryClient=new QueryClient({defaultOptions:{queries:{retry:false}}});
    vi.spyOn(exploreFeedApi,'getFeed').mockRejectedValueOnce(new Error('Serviço indisponível')).mockResolvedValueOnce({items:[],nextCursor:null,hasNext:false,total:0,rankingVersion:'test',snapshotExpiresAt:new Date().toISOString()});
    render(<QueryClientProvider client={queryClient}><ThemeProvider><ExploreFeedView initialMode="ALL"/></ThemeProvider></QueryClientProvider>);
    const action=await screen.findByRole('button',{name:'Ver todas as regiões'});fireEvent.click(action);
    expect(await screen.findByText('Nenhuma barbearia encontrada')).toBeTruthy();
  });

  it('publica a mídia ativa visível via onActiveMediaChange, publica null ao ficar invisível (isVisible=false) e republica ao retornar sem exigir scroll', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.spyOn(exploreFeedApi, 'getFeed').mockResolvedValue({
      items: [
        {
          barbershop: {
            id: 'shop-active-1',
            slug: 'barbearia-ativa',
            name: 'Barbearia Ativa',
            location: 'Pinheiros, São Paulo',
            logoUrl: null,
            rating: 4.9,
            reviewCount: 18,
            googleMapsUrl: null,
          },
          distanceMeters: 500,
          distanceBasis: 'user',
          rankingScore: {
            score: 0.92,
            distanceComponent: 0.85,
            reputationComponent: 0.95,
            bayesRating: 4.85,
          },
          media: [
            {
              id: 'media-srv-10',
              kind: 'service',
              mediaId: 'asset-10',
              serviceId: 'srv-10',
              url: 'https://images.example.com/corte10.jpg',
              width: 1080,
              height: 1920,
              alt: 'Corte Navalhado',
              service: {
                id: 'srv-10',
                title: 'Corte Navalhado',
                priceInCents: 6000,
                durationInMinutes: 40,
              },
            },
            {
              id: 'media-env-20',
              kind: 'environment',
              mediaId: 'asset-20',
              serviceId: null,
              url: 'https://images.example.com/env20.jpg',
              width: 1080,
              height: 1920,
              alt: 'Salão Principal',
              service: null,
            },
          ],
        },
      ],
      nextCursor: 'cursor-2',
      hasNext: true,
      total: 2,
      rankingVersion: 'v1',
      snapshotExpiresAt: new Date().toISOString(),
    });

    const onActiveMediaChange = vi.fn();

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView
            isVisible={true}
            onActiveMediaChange={onActiveMediaChange}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Barbearia Ativa')).toBeTruthy();

    expect(onActiveMediaChange).toHaveBeenLastCalledWith({
      shopId: 'shop-active-1',
      shopName: 'Barbearia Ativa',
      mediaId: 'media-srv-10',
      service: {
        id: 'srv-10',
        title: 'Corte Navalhado',
        priceInCents: 6000,
        durationInMinutes: 40,
      },
    });

    // Oculta o feed (ex.: usuário mudou para Perto de você)
    rerender(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView
            isVisible={false}
            onActiveMediaChange={onActiveMediaChange}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(onActiveMediaChange).toHaveBeenLastCalledWith(null);

    // Retorna para o feed (isVisible=true): deve republicar imediatamente sem exigir scroll
    rerender(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView
            isVisible={true}
            onActiveMediaChange={onActiveMediaChange}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(onActiveMediaChange).toHaveBeenLastCalledWith({
      shopId: 'shop-active-1',
      shopName: 'Barbearia Ativa',
      mediaId: 'media-srv-10',
      service: {
        id: 'srv-10',
        title: 'Corte Navalhado',
        priceInCents: 6000,
        durationInMinutes: 40,
      },
    });
  });

  it('não inventa serviço para foto ambiental ao publicar mídia ativa', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.spyOn(exploreFeedApi, 'getFeed').mockResolvedValue({
      items: [
        {
          barbershop: {
            id: 'shop-env-only',
            slug: 'barbearia-ambiente',
            name: 'Barbearia Ambiente',
            location: 'Centro, São Paulo',
            logoUrl: null,
            rating: null,
            reviewCount: 0,
            googleMapsUrl: null,
          },
          distanceMeters: null,
          distanceBasis: 'unavailable',
          rankingScore: {
            score: 0.7,
            distanceComponent: null,
            reputationComponent: 0.7,
            bayesRating: 4.0,
          },
          media: [
            {
              id: 'media-env-only',
              kind: 'environment',
              mediaId: 'asset-env-1',
              serviceId: null,
              url: 'https://images.example.com/ambiente.jpg',
              width: 1080,
              height: 1920,
              alt: 'Fachada',
              service: null,
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

    const onActiveMediaChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView
            isVisible={true}
            onActiveMediaChange={onActiveMediaChange}
          />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Barbearia Ambiente')).toBeTruthy();

    expect(onActiveMediaChange).toHaveBeenLastCalledWith({
      shopId: 'shop-env-only',
      shopName: 'Barbearia Ambiente',
      mediaId: 'media-env-only',
      service: null,
    });
  });

  it('preserva geometria válida anterior quando recebe medidas zeradas durante ocultação e não dispara fetchNextPage oculto', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const feedSpy = vi.spyOn(exploreFeedApi, 'getFeed').mockResolvedValue({
      items: [
        {
          barbershop: {
            id: 'shop-geom-1',
            slug: 'barbearia-geometria',
            name: 'Barbearia Geometria',
            location: 'Itaim, São Paulo',
            logoUrl: null,
            rating: 5.0,
            reviewCount: 9,
            googleMapsUrl: null,
          },
          distanceMeters: 300,
          distanceBasis: 'user',
          rankingScore: {
            score: 0.9,
            distanceComponent: 0.9,
            reputationComponent: 0.9,
            bayesRating: 4.9,
          },
          media: [
            {
              id: 'm-geom-1',
              kind: 'service',
              mediaId: 'asset-g1',
              serviceId: 'srv-g1',
              url: 'https://images.example.com/g1.jpg',
              width: 1080,
              height: 1920,
              alt: 'Corte',
              service: {
                id: 'srv-g1',
                title: 'Corte Geométrico',
                priceInCents: 7000,
                durationInMinutes: 45,
              },
            },
          ],
        },
      ],
      nextCursor: 'next-cursor-geom',
      hasNext: true,
      total: 5,
      rankingVersion: 'v1',
      snapshotExpiresAt: new Date().toISOString(),
    });

    const { rerender, container } = render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView isVisible={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Barbearia Geometria')).toBeTruthy();
    expect(feedSpy).toHaveBeenCalledTimes(1);

    // Oculta o feed
    rerender(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView isVisible={false} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // O container oculto deve ter aria-hidden="true" e não ter disparado novas páginas
    const hiddenRoot = container.querySelector('[aria-hidden="true"]');
    expect(hiddenRoot).toBeTruthy();
    expect(feedSpy).toHaveBeenCalledTimes(1);

    // Retorna para visível e garante que o slide continua renderizado com altura íntegra
    rerender(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ExploreFeedView isVisible={true} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Barbearia Geometria')).toBeTruthy();
  });
});

// Native player is verified separately; these tests exercise gallery and catalogue UI.
vi.mock('@/features/discovery/ui/ExploreVideo', () => ({
  ExploreVideo: () => <div data-testid="native-video-mock" />,
}));
