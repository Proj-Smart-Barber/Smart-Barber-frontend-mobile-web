import { httpClient } from '../../../shared/api';
export class OwnerReviewsApi {
    /**
     * Resumo de métricas gerenciais para o proprietário da barbearia
     * GET /api/barbershops/:shopId/review-insights/summary
     */
    async getSummary(shopId, filters = {}) {
        return httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/review-insights/summary`, {
            params: filters,
        });
    }
    /**
     * Métricas por serviço da barbearia
     * GET /api/barbershops/:shopId/review-insights/services
     */
    async getServiceMetrics(shopId, filters = {}) {
        return httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/review-insights/services`, {
            params: filters,
        });
    }
    /**
     * Métricas por profissional da barbearia
     * GET /api/barbershops/:shopId/review-insights/professionals
     */
    async getProfessionalMetrics(shopId, filters = {}) {
        return httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/review-insights/professionals`, {
            params: filters,
        });
    }
    /**
     * Histórico detalhado e paginado de feedbacks para o proprietário
     * GET /api/barbershops/:shopId/review-insights/feedbacks
     */
    async getFeedbacks(shopId, filters = {}) {
        return httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/review-insights/feedbacks`, {
            params: filters,
        });
    }
}
export const ownerReviewsApi = new OwnerReviewsApi();
