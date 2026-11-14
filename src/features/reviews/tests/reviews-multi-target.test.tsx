// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { BookingCard } from '@/features/bookings/ui/BookingCard';
import { BarbershopReviewsList } from '../ui/BarbershopReviewsList';
import { TargetReviewsModal } from '../ui/TargetReviewsModal';
import { ReviewFormModal } from '../ui/ReviewFormModal';
import { invalidateRelevantReviewCaches, reviewQueryKeys } from '../model/use-reviews';
import { reviewsApi } from '../api/reviews.api';
import { ExploreFeedSlide } from '@/features/discovery/ui/ExploreFeedSlide';
import { DesktopExploreContext } from '@/features/discovery/ui/desktop-explore-context';
import { ServiceCard } from '@/features/services/ui/ServiceCard';
import { BarbershopCard } from '@/features/discovery/ui/BarbershopCard';
import type { ExploreFeedItem } from '@/features/discovery/api/explore-feed.contract';

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => React.createElement('div', { style }, children),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('@/shared/navigation/LiquidGlassView', () => ({
  LiquidGlassView: ({ children, style }: any) => React.createElement('div', { style }, children),
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

function renderWithQuery(ui: React.ReactElement, client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{ui}</ThemeProvider>
      </QueryClientProvider>,
    ),
  };
}

describe('Reviews Multi-Target & Explore Honest Ratings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe ação de avaliar no BookingCard apenas para agendamentos COMPLETED', async () => {
    vi.spyOn(reviewsApi, 'getBookingReview').mockResolvedValue({ review: null });

    const baseBooking = {
      id: 'booking-1',
      barbershopId: 'shop-1',
      barbershopName: 'Navalha Imperial',
      barbermanId: 'barber-1',
      barbermanName: 'Carlos',
      startsAt: '2026-11-10T14:00:00Z',
      status: 'COMPLETED',
      services: [
        {
          id: 'srv-1',
          bookingServiceItemId: 'bsi-1',
          serviceId: 'srv-1',
          title: 'Corte Clássico',
          priceInCents: 5000,
          durationInMinutes: 30,
        },
      ],
    };

    const { rerender } = renderWithQuery(<BookingCard booking={baseBooking as any} />);
    await waitFor(() => {
      expect(screen.getByText('Avaliar Atendimento')).toBeTruthy();
    });

    rerender(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ThemeProvider>
          <BookingCard booking={{ ...baseBooking, status: 'CONFIRMED' } as any} />
        </ThemeProvider>
      </QueryClientProvider>,
    );
    expect(screen.queryByText('Avaliar Atendimento')).toBeNull();
  });

  it('envia avaliação multi-alvo (barbearia, barbeiro, múltiplos serviços e snapshot legado) com feedback privado isolado e invalida escopo certo', async () => {
    const createSpy = vi
      .spyOn(reviewsApi, 'createReview')
      .mockResolvedValueOnce({
        review: {
          id: 'rev-new',
          bookingId: 'booking-multi',
          rating: 5,
          comment: 'Ótimo atendimento',
          status: 'PUBLISHED',
          version: 1,
          createdAt: new Date().toISOString(),
          author: { id: 'client-1', name: 'Cliente' },
          items: [],
        },
      });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderWithQuery(
      <ReviewFormModal
        visible
        bookingId="booking-multi"
        barbershopId="shop-1"
        barbershopName="Barbearia Modelo"
        barberId="barber-1"
        barberName="Carlos Barbeiro"
        services={[
          {
            bookingServiceItemId: 'bsi-corte',
            serviceId: 'srv-corte',
            title: 'Corte Degradê',
          },
          {
            bookingServiceItemId: 'bsi-legacy',
            serviceId: null,
            title: 'Combo Snapshot Legado',
          },
        ]}
        onClose={vi.fn()}
      />,
      queryClient,
    );

    expect(screen.getByText('Barbearia (Barbearia Modelo)')).toBeTruthy();
    expect(screen.getByText('Profissional • Carlos Barbeiro')).toBeTruthy();
    expect(screen.getByText('Corte Degradê')).toBeTruthy();
    expect(screen.getByText('Combo Snapshot Legado')).toBeTruthy();
    expect(
      screen.getByText(/Feedback privado sobre o app Smart Barber/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByText('Avaliar o app Smart Barber'));

    // Star buttons follow rendering order: [barbershop 1..5], [barber 1..5], [srv1 1..5], [srv2 1..5], [platform 1..5]
    const fourStars = screen.getAllByLabelText('Classificar com 4 de 5 estrelas');
    const threeStars = screen.getAllByLabelText('Classificar com 3 de 5 estrelas');
    const twoStars = screen.getAllByLabelText('Classificar com 2 de 5 estrelas');
    const oneStar = screen.getAllByLabelText('Classificar com 1 de 5 estrelas');

    fireEvent.click(fourStars[1]); // Barber = 4
    fireEvent.click(threeStars[2]); // Corte Degradê = 3
    fireEvent.click(twoStars[3]); // Combo Snapshot Legado = 2
    fireEvent.click(oneStar[4]); // Platform feedback = 1

    const submitBtn = screen.getByText('Enviar Avaliação');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        'booking-multi',
        expect.objectContaining({
          rating: 5,
          barbershopRating: 5,
          barberId: 'barber-1',
          barberRating: 4,
          serviceRatings: [
            { bookingServiceItemId: 'bsi-corte', serviceId: 'srv-corte', rating: 3 },
            { bookingServiceItemId: 'bsi-legacy', serviceId: null, rating: 2 },
          ],
          platformFeedback: { rating: 1, comment: null },
        }),
      );
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['barbershop', 'public', 'shop-1'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['services', 'public', 'shop-1'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['reviews', 'professional', 'shop-1', 'barber-1'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['reviews', 'service', 'shop-1', 'srv-corte'],
    });
  });

  it('pré-preenche edição multi-alvo e propaga expectedVersion em updateReview', async () => {
    const updateSpy = vi
      .spyOn(reviewsApi, 'updateReview')
      .mockResolvedValueOnce({
        review: {
          id: 'rev-edit',
          bookingId: 'booking-edit',
          rating: 4,
          status: 'PUBLISHED',
          version: 2,
          createdAt: new Date().toISOString(),
          author: { id: 'client-1', name: 'Cliente' },
        },
      });

    renderWithQuery(
      <ReviewFormModal
        visible
        isEditing
        bookingId="booking-edit"
        barbershopId="shop-1"
        barbershopName="Barbearia Modelo"
        barberId="barber-1"
        barberName="Carlos"
        services={[{ bookingServiceItemId: 'bsi-1', serviceId: 'srv-1', title: 'Corte' }]}
        expectedVersion={3}
        initialRating={4}
        initialComment="Comentário antigo"
        existingReview={{
          id: 'rev-edit',
          bookingId: 'booking-edit',
          rating: 4,
          comment: 'Comentário antigo',
          version: 3,
          createdAt: new Date().toISOString(),
          author: { id: 'client-1', name: 'Cliente' },
          items: [
            {
              id: 'i-shop',
              targetType: 'BARBERSHOP',
              targetId: 'shop-1',
              bookingServiceItemId: null,
              targetLabel: 'Barbearia Modelo',
              rating: 4,
            },
            {
              id: 'i-barber',
              targetType: 'BARBER',
              targetId: 'barber-1',
              bookingServiceItemId: null,
              targetLabel: 'Carlos',
              rating: 5,
            },
            {
              id: 'i-srv',
              targetType: 'SERVICE',
              targetId: 'srv-1',
              bookingServiceItemId: 'bsi-1',
              targetLabel: 'Corte',
              rating: 3,
            },
          ],
          platformFeedback: {
            id: 'pf-1',
            rating: 5,
            comment: 'App ótimo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Salvar Alterações'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'booking-edit',
        expect.objectContaining({
          rating: 4,
          barberId: 'barber-1',
          barberRating: 5,
          expectedVersion: 3,
          serviceRatings: [{ bookingServiceItemId: 'bsi-1', serviceId: 'srv-1', rating: 3 }],
          platformFeedback: { rating: 5, comment: 'App ótimo' },
        }),
      );
    });
  });

  it('exibe breakdown de alvos em BarbershopReviewsList e avaliações específicas em TargetReviewsModal (com estado vazio honesto)', async () => {
    vi.spyOn(reviewsApi, 'listBarbershopReviews').mockResolvedValueOnce({
      reviews: [
        {
          id: 'rev-1',
          bookingId: 'b-1',
          rating: 5,
          comment: 'Muito bom!',
          createdAt: new Date().toISOString(),
          author: { id: 'u-1', name: 'Ana' },
          targets: [
            { targetType: 'BARBER', targetId: 'barber-1', targetLabel: 'Carlos', rating: 4 },
            { targetType: 'SERVICE', targetId: 'srv-1', targetLabel: 'Corte', rating: 3 },
          ],
        },
      ],
      total: 1,
      averageRating: 5,
      reviewCount: 1,
    });

    vi.spyOn(reviewsApi, 'listServiceReviews').mockResolvedValueOnce({
      targetType: 'SERVICE',
      targetId: 'srv-empty',
      reviews: [],
      total: 0,
      averageRating: null,
      reviewCount: 0,
    });

    renderWithQuery(
      <>
        <BarbershopReviewsList barbershopId="shop-1" />
        <TargetReviewsModal
          visible
          shopId="shop-1"
          targetType="SERVICE"
          targetId="srv-empty"
          targetName="Barba Vapor"
          onClose={vi.fn()}
        />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText('Profissional: 4 ★')).toBeTruthy();
      expect(screen.getByText('Corte: 3 ★')).toBeTruthy();
      expect(
        screen.getByText('Ainda sem avaliações publicadas para este serviço.'),
      ).toBeTruthy();
    });
  });

  it('propaga notas de barbearia e serviço no Explore, DesktopExploreContext, BarbershopCard e ServiceCard e exibe "Sem avaliações" quando zerado', () => {
    const ratedItem: ExploreFeedItem = {
      barbershop: {
        id: 'shop-1',
        slug: 'shop-1',
        name: 'Barbearia Real',
        location: 'Centro',
        logoUrl: null,
        rating: 4.9,
        reviewCount: 7,
        googleMapsUrl: null,
      },
      distanceMeters: 500,
      distanceBasis: 'user',
      rankingScore: {
        score: 0.9,
        distanceComponent: 0.8,
        reputationComponent: 0.95,
        bayesRating: 4.8,
      },
      media: [
        {
          id: 'm1',
          kind: 'service',
          mediaId: 'asset-1',
          serviceId: 'srv-1',
          url: 'https://cdn.example.com/1.jpg',
          width: 1080,
          height: 1350,
          alt: 'Corte',
          service: {
            id: 'srv-1',
            title: 'Corte Fade',
            priceInCents: 5500,
            durationInMinutes: 35,
            rating: 4.5,
            reviewCount: 2,
          },
        },
      ],
    };

    const unratedItem: ExploreFeedItem = {
      ...ratedItem,
      barbershop: {
        ...ratedItem.barbershop,
        id: 'shop-empty',
        name: 'Barbearia Sem Nota',
        rating: null,
        reviewCount: 0,
      },
      media: [
        {
          ...ratedItem.media[0],
          service: {
            ...ratedItem.media[0].service!,
            id: 'srv-empty',
            title: 'Barba Nova',
            rating: null,
            reviewCount: 0,
          },
        },
      ],
    };

    renderWithQuery(
      <>
        <ExploreFeedSlide
          item={ratedItem}
          width={390}
          height={844}
          bottomInset={80}
          topInset={44}
          onOpenService={vi.fn()}
          onOpenCatalog={vi.fn()}
          onOpenAbout={vi.fn()}
          onOpenReviews={vi.fn()}
        />
        <DesktopExploreContext
          item={unratedItem}
          media={unratedItem.media[0]}
          onBook={vi.fn()}
          onCatalog={vi.fn()}
          onAbout={vi.fn()}
          onReviews={vi.fn()}
        />
        <BarbershopCard
          shop={{
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Shop Vazia',
            slug: 'shop-vazia',
            location: 'Rua A',
            avatarUrl: null,
            rating: null,
            reviewCount: 0,
            coordinates: null,
            distanceMeters: null,
          }}
        />
        <ServiceCard
          service={{
            id: 'srv-card-1',
            barbershopId: 'shop-1',
            title: 'Corte Card',
            description: null,
            priceInCents: 5000,
            durationInMinutes: 30,
            isActive: true,
            rating: 4.7,
            reviewCount: 3,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }}
        />
      </>,
    );

    expect(screen.getByText(/4,9 \(7\)/)).toBeTruthy();
    expect(screen.getByText(/★ 4,5 \(2\) no serviço/)).toBeTruthy();
    expect(screen.getAllByText('Sem avaliações').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Serviço sem avaliações')).toBeTruthy();
    expect(screen.getByText('4.7 (3)')).toBeTruthy();
  });

  it('invalida somente os caches relevantes para a barbearia, profissional e serviços avaliados', () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries');

    invalidateRelevantReviewCaches(queryClient, {
      bookingId: 'b-1',
      barbershopId: 'shop-1',
      barberId: 'barber-1',
      serviceIds: ['srv-1', null, 'srv-2'],
    });

    expect(spy).toHaveBeenCalledWith({ queryKey: reviewQueryKeys.booking('b-1') });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['reviews', 'barbershop', 'shop-1'] });
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['reviews', 'professional', 'shop-1', 'barber-1'],
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['reviews', 'service', 'shop-1', 'srv-1'],
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['reviews', 'service', 'shop-1', 'srv-2'],
    });
  });
});
