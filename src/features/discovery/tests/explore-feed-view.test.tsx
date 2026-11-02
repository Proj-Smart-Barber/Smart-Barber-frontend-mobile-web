// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
          <ExploreFeedView initialRadius={10} />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Barbearia Estação Mooca — Demonstração')).toBeTruthy();
    expect(await screen.findByText('Barba Terapia e Alinhamento')).toBeTruthy();
  });
});

// Native player is verified separately; these tests exercise gallery and catalogue UI.
vi.mock('@/features/discovery/ui/ExploreVideo', () => ({
  ExploreVideo: () => <div data-testid="native-video-mock" />,
}));
