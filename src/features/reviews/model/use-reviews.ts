import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../api/reviews.api';
import type {
  BarbershopReviewsResponseDto,
  CreateReviewRequestDto,
  UpdateReviewRequestDto,
  TargetReviewsResponseDto,
} from '../api/reviews.types';

export const reviewQueryKeys = {
  all: ['reviews'] as const,
  barbershop: (shopId: string, page: number = 1) =>
    ['reviews', 'barbershop', shopId, page] as const,
  professional: (shopId: string, barberId: string, page: number = 1) =>
    ['reviews', 'professional', shopId, barberId, page] as const,
  service: (shopId: string, serviceId: string, page: number = 1) =>
    ['reviews', 'service', shopId, serviceId, page] as const,
  booking: (bookingId: string) => ['reviews', 'booking', bookingId] as const,
  moderationQueue: (page: number = 1) => ['reviews', 'moderation', page] as const,
};

export interface ReviewInvalidationScope {
  bookingId?: string;
  barbershopId?: string;
  barberId?: string | null;
  serviceIds?: (string | null | undefined)[];
}

export function invalidateRelevantReviewCaches(
  queryClient: QueryClient,
  scope: ReviewInvalidationScope = {},
): void {
  if (scope.bookingId) {
    queryClient.invalidateQueries({
      queryKey: reviewQueryKeys.booking(scope.bookingId),
    });
  }

  if (scope.barbershopId) {
    queryClient.invalidateQueries({
      queryKey: ['reviews', 'barbershop', scope.barbershopId],
    });
    queryClient.invalidateQueries({
      queryKey: ['barbershop', 'public', scope.barbershopId],
    });
    queryClient.invalidateQueries({
      queryKey: ['barbershop', scope.barbershopId, 'professionals'],
    });
    queryClient.invalidateQueries({
      queryKey: ['services', 'public', scope.barbershopId],
    });
    if (scope.barberId) {
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'professional', scope.barbershopId, scope.barberId],
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'professional', scope.barbershopId],
      });
    }
    const validServiceIds = (scope.serviceIds ?? []).filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
    if (validServiceIds.length > 0) {
      for (const serviceId of validServiceIds) {
        queryClient.invalidateQueries({
          queryKey: ['reviews', 'service', scope.barbershopId, serviceId],
        });
      }
    } else {
      queryClient.invalidateQueries({
        queryKey: ['reviews', 'service', scope.barbershopId],
      });
    }
  } else {
    queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: ['barbershop'] });
    queryClient.invalidateQueries({ queryKey: ['services'] });
  }

  queryClient.invalidateQueries({ queryKey: ['discovery'] });
  queryClient.invalidateQueries({ queryKey: ['explore-feed'] });
  queryClient.invalidateQueries({ queryKey: ['bookings'] });
}

export function useBarbershopReviews(shopId?: string, page: number = 1) {
  return useQuery<BarbershopReviewsResponseDto>({
    queryKey: reviewQueryKeys.barbershop(shopId || '', page),
    queryFn: () => reviewsApi.listBarbershopReviews(shopId!, page),
    enabled: Boolean(shopId),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useProfessionalReviews(
  shopId?: string,
  barberId?: string,
  page: number = 1,
) {
  return useQuery<TargetReviewsResponseDto>({
    queryKey: reviewQueryKeys.professional(shopId || '', barberId || '', page),
    queryFn: () => reviewsApi.listProfessionalReviews(shopId!, barberId!, page),
    enabled: Boolean(shopId && barberId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useServiceReviews(
  shopId?: string,
  serviceId?: string,
  page: number = 1,
) {
  return useQuery<TargetReviewsResponseDto>({
    queryKey: reviewQueryKeys.service(shopId || '', serviceId || '', page),
    queryFn: () => reviewsApi.listServiceReviews(shopId!, serviceId!, page),
    enabled: Boolean(shopId && serviceId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useBookingReview(bookingId?: string) {
  return useQuery({
    queryKey: reviewQueryKeys.booking(bookingId || ''),
    queryFn: () => reviewsApi.getBookingReview(bookingId!),
    enabled: Boolean(bookingId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateReview(onSuccessCallback?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: CreateReviewRequestDto;
      barbershopId?: string;
    }) => reviewsApi.createReview(bookingId, data),
    onSuccess: (_, variables) => {
      invalidateRelevantReviewCaches(queryClient, {
        bookingId: variables.bookingId,
        barbershopId: variables.barbershopId,
        barberId: variables.data.barberId,
        serviceIds: variables.data.serviceRatings?.map((s) => s.serviceId),
      });
      onSuccessCallback?.();
    },
  });
}

export function useUpdateReview(onSuccessCallback?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: {
      bookingId: string;
      data: UpdateReviewRequestDto;
      barbershopId?: string;
    }) => reviewsApi.updateReview(bookingId, data),
    onSuccess: (_, variables) => {
      invalidateRelevantReviewCaches(queryClient, {
        bookingId: variables.bookingId,
        barbershopId: variables.barbershopId,
        barberId: variables.data.barberId,
        serviceIds: variables.data.serviceRatings?.map((s) => s.serviceId),
      });
      onSuccessCallback?.();
    },
  });
}

export function useDeleteReview(onSuccessCallback?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      expectedVersion,
    }: {
      bookingId: string;
      expectedVersion: number;
      barbershopId?: string;
    }) => reviewsApi.deleteReview(bookingId, expectedVersion),
    onSuccess: (_, variables) => {
      invalidateRelevantReviewCaches(queryClient, {
        bookingId: variables.bookingId,
        barbershopId: variables.barbershopId,
      });
      onSuccessCallback?.();
    },
  });
}

export function useReportReview(onSuccessCallback?: () => void) {
  return useMutation({
    mutationFn: ({
      reviewId,
      reason,
    }: {
      reviewId: string;
      reason: string;
    }) => reviewsApi.reportReview(reviewId, reason),
    onSuccess: () => {
      onSuccessCallback?.();
    },
  });
}

export function useModerateReview(onSuccessCallback?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      action,
      expectedVersion,
      note,
    }: {
      reviewId: string;
      action: 'HIDE' | 'RESTORE';
      expectedVersion: number;
      note?: string;
    }) => reviewsApi.moderateReview(reviewId, action, expectedVersion, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['barbershop'] });
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
      queryClient.invalidateQueries({ queryKey: ['explore-feed'] });
      onSuccessCallback?.();
    },
  });
}

export function useModerationQueue(page: number = 1) {
  return useQuery({
    queryKey: reviewQueryKeys.moderationQueue(page),
    queryFn: () => reviewsApi.listModerationQueue(page),
    staleTime: 1000 * 30,
  });
}
