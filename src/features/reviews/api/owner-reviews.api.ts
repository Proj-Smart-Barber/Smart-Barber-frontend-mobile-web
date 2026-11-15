import { httpClient } from '@/shared/api';
import type {
  FeedbacksResponseDto,
  OwnerFeedbacksFilters,
  OwnerProfessionalMetricsFilters,
  OwnerReviewSummaryFilters,
  OwnerServiceMetricsFilters,
  ProfessionalMetricsResponseDto,
  ReviewSummaryMetricsDto,
  ServiceMetricsResponseDto,
} from './owner-reviews.types';

export class OwnerReviewsApi {
  /**
   * Resumo de métricas gerenciais para o proprietário da barbearia
   * GET /api/barbershops/:shopId/review-insights/summary
   */
  async getSummary(
    shopId: string,
    filters: OwnerReviewSummaryFilters = {},
  ): Promise<ReviewSummaryMetricsDto> {
    return httpClient.get<ReviewSummaryMetricsDto>(
      `/api/barbershops/${encodeURIComponent(shopId)}/review-insights/summary`,
      {
        params: filters,
      },
    );
  }

  /**
   * Métricas por serviço da barbearia
   * GET /api/barbershops/:shopId/review-insights/services
   */
  async getServiceMetrics(
    shopId: string,
    filters: OwnerServiceMetricsFilters = {},
  ): Promise<ServiceMetricsResponseDto> {
    return httpClient.get<ServiceMetricsResponseDto>(
      `/api/barbershops/${encodeURIComponent(shopId)}/review-insights/services`,
      {
        params: filters,
      },
    );
  }

  /**
   * Métricas por profissional da barbearia
   * GET /api/barbershops/:shopId/review-insights/professionals
   */
  async getProfessionalMetrics(
    shopId: string,
    filters: OwnerProfessionalMetricsFilters = {},
  ): Promise<ProfessionalMetricsResponseDto> {
    return httpClient.get<ProfessionalMetricsResponseDto>(
      `/api/barbershops/${encodeURIComponent(shopId)}/review-insights/professionals`,
      {
        params: filters,
      },
    );
  }

  /**
   * Histórico detalhado e paginado de feedbacks para o proprietário
   * GET /api/barbershops/:shopId/review-insights/feedbacks
   */
  async getFeedbacks(
    shopId: string,
    filters: OwnerFeedbacksFilters = {},
  ): Promise<FeedbacksResponseDto> {
    return httpClient.get<FeedbacksResponseDto>(
      `/api/barbershops/${encodeURIComponent(shopId)}/review-insights/feedbacks`,
      {
        params: filters,
      },
    );
  }
}

export const ownerReviewsApi = new OwnerReviewsApi();
