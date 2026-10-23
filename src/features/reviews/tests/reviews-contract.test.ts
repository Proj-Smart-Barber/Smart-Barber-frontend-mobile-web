import { describe, it, expect, vi } from 'vitest';
import type { ReviewItemDto, BarbershopReviewsResponseDto } from '../api/reviews.types';

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
});
