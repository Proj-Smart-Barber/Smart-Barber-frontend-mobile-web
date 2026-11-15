import { useQuery } from '@tanstack/react-query';
import { ownerReviewsApi } from '../api/owner-reviews.api';
import type {
  FeedbacksResponseDto,
  OwnerFeedbacksFilters,
  OwnerProfessionalMetricsFilters,
  OwnerReviewSummaryFilters,
  OwnerServiceMetricsFilters,
  ProfessionalMetricsResponseDto,
  ReviewSummaryMetricsDto,
  ServiceMetricsResponseDto,
} from '../api/owner-reviews.types';

export const ownerReviewQueryKeys = {
  all: ['owner-reviews'] as const,
  summary: (shopId: string, filters?: OwnerReviewSummaryFilters) =>
    ['owner-reviews', 'summary', shopId, filters] as const,
  services: (shopId: string, filters?: OwnerServiceMetricsFilters) =>
    ['owner-reviews', 'services', shopId, filters] as const,
  professionals: (shopId: string, filters?: OwnerProfessionalMetricsFilters) =>
    ['owner-reviews', 'professionals', shopId, filters] as const,
  feedbacks: (shopId: string, filters?: OwnerFeedbacksFilters) =>
    ['owner-reviews', 'feedbacks', shopId, filters] as const,
};

export function useOwnerReviewSummary(
  shopId: string | null | undefined,
  filters: OwnerReviewSummaryFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery<ReviewSummaryMetricsDto>({
    queryKey: ownerReviewQueryKeys.summary(shopId ?? '', filters),
    queryFn: () => {
      if (!shopId) throw new Error('shopId é obrigatório para carregar métricas.');
      return ownerReviewsApi.getSummary(shopId, filters);
    },
    enabled: Boolean(shopId) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

export function useOwnerServiceMetrics(
  shopId: string | null | undefined,
  filters: OwnerServiceMetricsFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery<ServiceMetricsResponseDto>({
    queryKey: ownerReviewQueryKeys.services(shopId ?? '', filters),
    queryFn: () => {
      if (!shopId) throw new Error('shopId é obrigatório para carregar métricas de serviços.');
      return ownerReviewsApi.getServiceMetrics(shopId, filters);
    },
    enabled: Boolean(shopId) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

export function useOwnerProfessionalMetrics(
  shopId: string | null | undefined,
  filters: OwnerProfessionalMetricsFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery<ProfessionalMetricsResponseDto>({
    queryKey: ownerReviewQueryKeys.professionals(shopId ?? '', filters),
    queryFn: () => {
      if (!shopId) throw new Error('shopId é obrigatório para carregar métricas de profissionais.');
      return ownerReviewsApi.getProfessionalMetrics(shopId, filters);
    },
    enabled: Boolean(shopId) && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

export function useOwnerFeedbacks(
  shopId: string | null | undefined,
  filters: OwnerFeedbacksFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery<FeedbacksResponseDto>({
    queryKey: ownerReviewQueryKeys.feedbacks(shopId ?? '', filters),
    queryFn: () => {
      if (!shopId) throw new Error('shopId é obrigatório para carregar feedbacks.');
      return ownerReviewsApi.getFeedbacks(shopId, filters);
    },
    enabled: Boolean(shopId) && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}
