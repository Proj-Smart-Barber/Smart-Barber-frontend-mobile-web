import { httpClient } from '../../../shared/api';
export class ReviewsApi {
    /**
     * Lista avaliações públicas de uma barbearia com notas e contagem calculadas:
     * GET /api/barbershops/:shopId/reviews
     */
    async listBarbershopReviews(shopId, page = 1, limit = 10) {
        return httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/reviews`, {
            params: { page, limit },
        });
    }
    /**
     * Lista avaliações públicas de um profissional (barbeiro):
     * GET /api/barbershops/:shopId/professionals/:barberId/reviews
     */
    async listProfessionalReviews(shopId, barberId, page = 1, limit = 10) {
        return httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/professionals/${encodeURIComponent(barberId)}/reviews`, {
            params: { page, limit },
        });
    }
    /**
     * Lista avaliações públicas de um serviço:
     * GET /api/barbershops/:shopId/services/:serviceId/reviews
     */
    async listServiceReviews(shopId, serviceId, page = 1, limit = 10) {
        return httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/services/${encodeURIComponent(serviceId)}/reviews`, {
            params: { page, limit },
        });
    }
    /**
     * Consulta a avaliação de um agendamento específico:
     * GET /api/bookings/:bookingId/review
     */
    async getBookingReview(bookingId, token) {
        return httpClient.get(`/api/bookings/${encodeURIComponent(bookingId)}/review`, { token });
    }
    /**
     * Cria avaliação de agendamento concluído (apenas cliente do agendamento):
     * POST /api/bookings/:bookingId/review
     */
    async createReview(bookingId, data, token) {
        return httpClient.post(`/api/bookings/${encodeURIComponent(bookingId)}/review`, data, { token });
    }
    /**
     * Atualiza avaliação própria do agendamento:
     * PATCH /api/bookings/:bookingId/review
     */
    async updateReview(bookingId, data, token) {
        return httpClient.patch(`/api/bookings/${encodeURIComponent(bookingId)}/review`, data, { token });
    }
    /**
     * Remove avaliação própria (soft delete):
     * DELETE /api/bookings/:bookingId/review
     */
    async deleteReview(bookingId, expectedVersion, token) {
        return httpClient.delete(`/api/bookings/${encodeURIComponent(bookingId)}/review`, { expectedVersion }, {
            params: { expectedVersion: String(expectedVersion) },
            token,
        });
    }
    /**
     * Denuncia uma avaliação abusiva:
     * POST /api/reviews/:reviewId/report
     */
    async reportReview(reviewId, reason, token) {
        return httpClient.post(`/api/reviews/${encodeURIComponent(reviewId)}/report`, { reason }, { token });
    }
    /**
     * Modera avaliação (apenas PLATFORM_ADMIN):
     * PATCH /api/reviews/:reviewId/moderation
     */
    async moderateReview(reviewId, action, expectedVersion, note, token) {
        return httpClient.patch(`/api/reviews/${encodeURIComponent(reviewId)}/moderation`, { action, expectedVersion, note }, { token });
    }
    /**
     * Consulta fila de moderação (apenas PLATFORM_ADMIN):
     * GET /api/reviews/moderation/queue
     */
    async listModerationQueue(page = 1, limit = 20, token) {
        return httpClient.get('/api/reviews/moderation/queue', {
            params: { page, limit },
            token,
        });
    }
}
export const reviewsApi = new ReviewsApi();
