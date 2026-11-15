import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
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
  forShop: (shopId: string) => ['owner-reviews', shopId] as const,
  summary: (shopId: string, actorId: string, filters?: OwnerReviewSummaryFilters) =>
    ['owner-reviews', shopId, 'summary', actorId, filters] as const,
  services: (shopId: string, actorId: string, filters?: OwnerServiceMetricsFilters) =>
    ['owner-reviews', shopId, 'services', actorId, filters] as const,
  professionals: (
    shopId: string,
    actorId: string,
    filters?: OwnerProfessionalMetricsFilters,
  ) => ['owner-reviews', shopId, 'professionals', actorId, filters] as const,
  feedbacks: (shopId: string, actorId: string, filters?: OwnerFeedbacksFilters) =>
    ['owner-reviews', shopId, 'feedbacks', actorId, filters] as const,
};

export function useOwnerReviewSummary(
  shopId: string | null | undefined,
  filters: OwnerReviewSummaryFilters = {},
  options?: { enabled?: boolean },
) {
  const { identity, staff } = useSession();
  const actorId = identity?.id ?? staff?.id ?? 'anonymous';

  return useQuery<ReviewSummaryMetricsDto>({
    queryKey: ownerReviewQueryKeys.summary(shopId ?? '', actorId, filters),
    queryFn: () => {
      if (!shopId) throw new Error('shopId é obrigatório para carregar métricas.');
      return ownerReviewsApi.getSummary(shopId, filters);
    },
    enabled: Boolean(shopId) && actorId !== 'anonymous' && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useOwnerServiceMetrics(
  shopId: string | null | undefined,
  filters: OwnerServiceMetricsFilters = {},
  options?: { enabled?: boolean },
) {
  const { identity, staff } = useSession();
  const actorId = identity?.id ?? staff?.id ?? 'anonymous';

  return useQuery<ServiceMetricsResponseDto>({
    queryKey: ownerReviewQueryKeys.services(shopId ?? '', actorId, filters),
    queryFn: () => {
      if (!shopId)
        throw new Error('shopId é obrigatório para carregar métricas de serviços.');
      return ownerReviewsApi.getServiceMetrics(shopId, filters);
    },
    enabled: Boolean(shopId) && actorId !== 'anonymous' && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useOwnerProfessionalMetrics(
  shopId: string | null | undefined,
  filters: OwnerProfessionalMetricsFilters = {},
  options?: { enabled?: boolean },
) {
  const { identity, staff } = useSession();
  const actorId = identity?.id ?? staff?.id ?? 'anonymous';

  return useQuery<ProfessionalMetricsResponseDto>({
    queryKey: ownerReviewQueryKeys.professionals(shopId ?? '', actorId, filters),
    queryFn: () => {
      if (!shopId)
        throw new Error('shopId é obrigatório para carregar métricas de profissionais.');
      return ownerReviewsApi.getProfessionalMetrics(shopId, filters);
    },
    enabled: Boolean(shopId) && actorId !== 'anonymous' && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useOwnerFeedbacks(
  shopId: string | null | undefined,
  filters: OwnerFeedbacksFilters = {},
  options?: { enabled?: boolean },
) {
  const { identity, staff } = useSession();
  const actorId = identity?.id ?? staff?.id ?? 'anonymous';

  return useQuery<FeedbacksResponseDto>({
    queryKey: ownerReviewQueryKeys.feedbacks(shopId ?? '', actorId, filters),
    queryFn: () => {
      if (!shopId) throw new Error('shopId é obrigatório para carregar feedbacks.');
      return ownerReviewsApi.getFeedbacks(shopId, filters);
    },
    enabled: Boolean(shopId) && actorId !== 'anonymous' && (options?.enabled ?? true),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}
