import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../api/reviews.api';
export const reviewQueryKeys = {
    all: ['reviews'],
    barbershop: (shopId, page = 1) => ['reviews', 'barbershop', shopId, page],
    professional: (shopId, barberId, page = 1) => ['reviews', 'professional', shopId, barberId, page],
    service: (shopId, serviceId, page = 1) => ['reviews', 'service', shopId, serviceId, page],
    booking: (bookingId) => ['reviews', 'booking', bookingId],
    moderationQueue: (page = 1) => ['reviews', 'moderation', page],
};
export function invalidateRelevantReviewCaches(queryClient, scope = {}) {
    var _a;
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
        }
        else {
            queryClient.invalidateQueries({
                queryKey: ['reviews', 'professional', scope.barbershopId],
            });
        }
        const validServiceIds = ((_a = scope.serviceIds) !== null && _a !== void 0 ? _a : []).filter((id) => typeof id === 'string' && id.length > 0);
        if (validServiceIds.length > 0) {
            for (const serviceId of validServiceIds) {
                queryClient.invalidateQueries({
                    queryKey: ['reviews', 'service', scope.barbershopId, serviceId],
                });
            }
        }
        else {
            queryClient.invalidateQueries({
                queryKey: ['reviews', 'service', scope.barbershopId],
            });
        }
    }
    else {
        queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: ['barbershop'] });
        queryClient.invalidateQueries({ queryKey: ['services'] });
    }
    queryClient.invalidateQueries({ queryKey: ['discovery'] });
    queryClient.invalidateQueries({ queryKey: ['explore-feed'] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
}
export function useBarbershopReviews(shopId, page = 1) {
    return useQuery({
        queryKey: reviewQueryKeys.barbershop(shopId || '', page),
        queryFn: () => reviewsApi.listBarbershopReviews(shopId, page),
        enabled: Boolean(shopId),
        staleTime: 1000 * 60 * 2, // 2 minutos
    });
}
export function useProfessionalReviews(shopId, barberId, page = 1) {
    return useQuery({
        queryKey: reviewQueryKeys.professional(shopId || '', barberId || '', page),
        queryFn: () => reviewsApi.listProfessionalReviews(shopId, barberId, page),
        enabled: Boolean(shopId && barberId),
        staleTime: 1000 * 60 * 2,
    });
}
export function useServiceReviews(shopId, serviceId, page = 1) {
    return useQuery({
        queryKey: reviewQueryKeys.service(shopId || '', serviceId || '', page),
        queryFn: () => reviewsApi.listServiceReviews(shopId, serviceId, page),
        enabled: Boolean(shopId && serviceId),
        staleTime: 1000 * 60 * 2,
    });
}
export function useBookingReview(bookingId) {
    return useQuery({
        queryKey: reviewQueryKeys.booking(bookingId || ''),
        queryFn: () => reviewsApi.getBookingReview(bookingId),
        enabled: Boolean(bookingId),
        staleTime: 1000 * 60 * 2,
    });
}
export function useCreateReview(onSuccessCallback) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ bookingId, data, }) => reviewsApi.createReview(bookingId, data),
        onSuccess: (_, variables) => {
            var _a;
            invalidateRelevantReviewCaches(queryClient, {
                bookingId: variables.bookingId,
                barbershopId: variables.barbershopId,
                barberId: variables.data.barberId,
                serviceIds: (_a = variables.data.serviceRatings) === null || _a === void 0 ? void 0 : _a.map((s) => s.serviceId),
            });
            onSuccessCallback === null || onSuccessCallback === void 0 ? void 0 : onSuccessCallback();
        },
    });
}
export function useUpdateReview(onSuccessCallback) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ bookingId, data, }) => reviewsApi.updateReview(bookingId, data),
        onSuccess: (_, variables) => {
            var _a;
            invalidateRelevantReviewCaches(queryClient, {
                bookingId: variables.bookingId,
                barbershopId: variables.barbershopId,
                barberId: variables.data.barberId,
                serviceIds: (_a = variables.data.serviceRatings) === null || _a === void 0 ? void 0 : _a.map((s) => s.serviceId),
            });
            onSuccessCallback === null || onSuccessCallback === void 0 ? void 0 : onSuccessCallback();
        },
    });
}
export function useDeleteReview(onSuccessCallback) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ bookingId, expectedVersion, }) => reviewsApi.deleteReview(bookingId, expectedVersion),
        onSuccess: (_, variables) => {
            invalidateRelevantReviewCaches(queryClient, {
                bookingId: variables.bookingId,
                barbershopId: variables.barbershopId,
            });
            onSuccessCallback === null || onSuccessCallback === void 0 ? void 0 : onSuccessCallback();
        },
    });
}
export function useReportReview(onSuccessCallback) {
    return useMutation({
        mutationFn: ({ reviewId, reason, }) => reviewsApi.reportReview(reviewId, reason),
        onSuccess: () => {
            onSuccessCallback === null || onSuccessCallback === void 0 ? void 0 : onSuccessCallback();
        },
    });
}
export function useModerateReview(onSuccessCallback) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ reviewId, action, expectedVersion, note, }) => reviewsApi.moderateReview(reviewId, action, expectedVersion, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reviewQueryKeys.all });
            queryClient.invalidateQueries({ queryKey: ['barbershop'] });
            queryClient.invalidateQueries({ queryKey: ['discovery'] });
            queryClient.invalidateQueries({ queryKey: ['explore-feed'] });
            onSuccessCallback === null || onSuccessCallback === void 0 ? void 0 : onSuccessCallback();
        },
    });
}
export function useModerationQueue(page = 1) {
    return useQuery({
        queryKey: reviewQueryKeys.moderationQueue(page),
        queryFn: () => reviewsApi.listModerationQueue(page),
        staleTime: 1000 * 30,
    });
}
