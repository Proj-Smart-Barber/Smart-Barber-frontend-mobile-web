import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../api/reviews.api';
import type {
  BarbershopReviewsResponseDto,
  CreateReviewRequestDto,
  UpdateReviewRequestDto,
} from '../api/reviews.types';

export const reviewQueryKeys = {
  all: ['reviews'] as const,
  barbershop: (shopId: string, page: number = 1) =>
    ['reviews', 'barbershop', shopId, page] as const,
  booking: (bookingId: string) => ['reviews', 'booking', bookingId] as const,
  moderationQueue: (page: number = 1) => ['reviews', 'moderation', page] as const,
};

export function useBarbershopReviews(shopId?: string, page: number = 1) {
  return useQuery<BarbershopReviewsResponseDto>({
    queryKey: reviewQueryKeys.barbershop(shopId || '', page),
    queryFn: () => reviewsApi.listBarbershopReviews(shopId!, page),
    enabled: Boolean(shopId),
    staleTime: 1000 * 60 * 2, // 2 minutos
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
    }) => reviewsApi.createReview(bookingId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.booking(variables.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: ['barbershop'] });
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
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
    }) => reviewsApi.updateReview(bookingId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.booking(variables.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: ['barbershop'] });
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
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
    }) => reviewsApi.deleteReview(bookingId, expectedVersion),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
      queryClient.invalidateQueries({
        queryKey: reviewQueryKeys.booking(variables.bookingId),
      });
      queryClient.invalidateQueries({ queryKey: ['barbershop'] });
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
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
