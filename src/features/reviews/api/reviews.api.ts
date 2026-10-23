import { httpClient } from '@/shared/api';
import type {
  BarbershopReviewsResponseDto,
  CreateReviewRequestDto,
  UpdateReviewRequestDto,
  ReviewItemDto,
  ModerationQueueItemDto,
} from './reviews.types';

export class ReviewsApi {
  /**
   * Lista avaliações públicas de uma barbearia com notas e contagem calculadas:
   * GET /api/barbershops/:shopId/reviews
   */
  async listBarbershopReviews(
    shopId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<BarbershopReviewsResponseDto> {
    return httpClient.get<BarbershopReviewsResponseDto>(
      `/api/barbershops/${encodeURIComponent(shopId)}/reviews`,
      {
        params: { page, limit },
      },
    );
  }

  /**
   * Consulta a avaliação de um agendamento específico:
   * GET /api/bookings/:bookingId/review
   */
  async getBookingReview(
    bookingId: string,
    token?: string | null,
  ): Promise<{ review: ReviewItemDto | null }> {
    return httpClient.get<{ review: ReviewItemDto | null }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/review`,
      { token },
    );
  }

  /**
   * Cria avaliação de agendamento concluído (apenas cliente do agendamento):
   * POST /api/bookings/:bookingId/review
   */
  async createReview(
    bookingId: string,
    data: CreateReviewRequestDto,
    token?: string | null,
  ): Promise<{ review: ReviewItemDto }> {
    return httpClient.post<{ review: ReviewItemDto }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/review`,
      data,
      { token },
    );
  }

  /**
   * Atualiza avaliação própria do agendamento:
   * PATCH /api/bookings/:bookingId/review
   */
  async updateReview(
    bookingId: string,
    data: UpdateReviewRequestDto,
    token?: string | null,
  ): Promise<{ review: ReviewItemDto }> {
    return httpClient.patch<{ review: ReviewItemDto }>(
      `/api/bookings/${encodeURIComponent(bookingId)}/review`,
      data,
      { token },
    );
  }

  /**
   * Remove avaliação própria (soft delete):
   * DELETE /api/bookings/:bookingId/review
   */
  async deleteReview(
    bookingId: string,
    expectedVersion: number,
    token?: string | null,
  ): Promise<void> {
    return httpClient.delete<void>(
      `/api/bookings/${encodeURIComponent(bookingId)}/review`,
      { expectedVersion },
      {
        params: { expectedVersion: String(expectedVersion) },
        token,
      },
    );
  }

  /**
   * Denuncia uma avaliação abusiva:
   * POST /api/reviews/:reviewId/report
   */
  async reportReview(
    reviewId: string,
    reason: string,
    token?: string | null,
  ): Promise<{ success: boolean; reportId: string }> {
    return httpClient.post<{ success: boolean; reportId: string }>(
      `/api/reviews/${encodeURIComponent(reviewId)}/report`,
      { reason },
      { token },
    );
  }

  /**
   * Modera avaliação (apenas PLATFORM_ADMIN):
   * PATCH /api/reviews/:reviewId/moderation
   */
  async moderateReview(
    reviewId: string,
    action: 'HIDE' | 'RESTORE',
    expectedVersion: number,
    note?: string,
    token?: string | null,
  ): Promise<{ review: ReviewItemDto }> {
    return httpClient.patch<{ review: ReviewItemDto }>(
      `/api/reviews/${encodeURIComponent(reviewId)}/moderation`,
      { action, expectedVersion, note },
      { token },
    );
  }

  /**
   * Consulta fila de moderação (apenas PLATFORM_ADMIN):
   * GET /api/reviews/moderation/queue
   */
  async listModerationQueue(
    page: number = 1,
    limit: number = 20,
    token?: string | null,
  ): Promise<{ reviews: ModerationQueueItemDto[]; total: number }> {
    return httpClient.get<{ reviews: ModerationQueueItemDto[]; total: number }>(
      '/api/reviews/moderation/queue',
      {
        params: { page, limit },
        token,
      },
    );
  }
}

export const reviewsApi = new ReviewsApi();
