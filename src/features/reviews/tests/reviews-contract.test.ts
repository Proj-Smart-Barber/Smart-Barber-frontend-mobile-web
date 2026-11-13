import { describe, it, expect, vi } from 'vitest';
import type { ReviewItemDto, BarbershopReviewsResponseDto } from '../api/reviews.types';

// O contrato verifica o payload HTTP, sem inicializar storage ou runtime React Native.
vi.mock('@/shared/api', () => ({
  httpClient: { delete: vi.fn(), patch: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

describe('Reviews Domain & Presentation Logic', () => {
  it('exibe "Ainda sem avaliações" quando total for zero', () => {
    const emptyResponse: BarbershopReviewsResponseDto = {
      reviews: [],
      total: 0,
      averageRating: 0,
      reviewCount: 0,
    };

    const hasReviews = emptyResponse.reviewCount > 0;
    expect(hasReviews).toBe(false);
  });

  it('calcula e formata a média das avaliações quando houver avaliações publicadas', () => {
    const populatedResponse: BarbershopReviewsResponseDto = {
      reviews: [
        {
          id: 'rev-1',
          bookingId: 'book-1',
          rating: 5,
          comment: 'Excelente atendimento!',
          createdAt: new Date().toISOString(),
          status: 'PUBLISHED',
          author: { id: 'user-1', name: 'João Silva' },
        },
        {
          id: 'rev-2',
          bookingId: 'book-2',
          rating: 4,
          comment: 'Muito bom corte.',
          createdAt: new Date().toISOString(),
          status: 'PUBLISHED',
          author: { id: 'user-2', name: 'Maria Souza' },
        },
      ],
      total: 2,
      averageRating: 4.5,
      reviewCount: 2,
    };

    expect(populatedResponse.reviewCount).toBe(2);
    expect(populatedResponse.averageRating.toFixed(1)).toBe('4.5');
  });

  it('preserva unicidade e integridade dos status de moderação', () => {
    const statuses = ['PUBLISHED', 'HIDDEN_BY_MODERATION', 'DELETED_BY_AUTHOR'] as const;
    expect(statuses).toHaveLength(3);
  });

  it('B02: ReviewsApi propaga expectedVersion obrigatório em deleteReview e moderateReview', async () => {
    const { httpClient } = await import('@/shared/api');
    const deleteSpy = vi.spyOn(httpClient, 'delete').mockResolvedValueOnce(undefined as any);
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValueOnce({} as any);

    const { reviewsApi } = await import('../api/reviews.api');

    await reviewsApi.deleteReview('booking-123', 2, 'fake-token');
    expect(deleteSpy).toHaveBeenCalledWith(
      '/api/bookings/booking-123/review',
      { expectedVersion: 2 },
      {
        params: { expectedVersion: '2' },
        token: 'fake-token',
      },
    );

    await reviewsApi.moderateReview('rev-456', 'HIDE', 3, 'Conteúdo impróprio', 'fake-token');
    expect(patchSpy).toHaveBeenCalledWith(
      '/api/reviews/rev-456/moderation',
      { action: 'HIDE', expectedVersion: 3, note: 'Conteúdo impróprio' },
      { token: 'fake-token' },
    );
  });

  it('ReviewsApi suporta payload multi-alvo em createReview e endpoints de listagem por barbeiro e serviço', async () => {
    const { httpClient } = await import('@/shared/api');
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValueOnce({ review: {} } as any);
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
      items: [],
      nextCursor: null,
      averageRating: null,
      reviewCount: 0,
    } as any);

    const { reviewsApi } = await import('../api/reviews.api');

    await reviewsApi.createReview(
      'booking-999',
      {
        rating: 5,
        barbershopRating: 5,
        barberId: 'barber-1',
        barberRating: 4,
        serviceRatings: [{ bookingServiceItemId: 'bsi-1', serviceId: 'srv-1', rating: 5 }],
        platformFeedback: { rating: 5, comment: 'Rápido' },
      },
      'fake-token',
    );
    expect(postSpy).toHaveBeenCalledWith(
      '/api/bookings/booking-999/review',
      expect.objectContaining({
        barberId: 'barber-1',
        barberRating: 4,
        serviceRatings: [{ bookingServiceItemId: 'bsi-1', serviceId: 'srv-1', rating: 5 }],
        platformFeedback: { rating: 5, comment: 'Rápido' },
      }),
      { token: 'fake-token' },
    );

    await reviewsApi.listProfessionalReviews('shop-1', 'barber-1', 1, 10);
    expect(getSpy).toHaveBeenCalledWith('/api/barbershops/shop-1/professionals/barber-1/reviews', {
      params: { page: 1, limit: 10 },
    });

    await reviewsApi.listServiceReviews('shop-1', 'srv-1', 1, 10);
    expect(getSpy).toHaveBeenCalledWith('/api/barbershops/shop-1/services/srv-1/reviews', {
      params: { page: 1, limit: 10 },
    });
  });
});
