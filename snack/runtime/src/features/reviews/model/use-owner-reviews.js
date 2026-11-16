import { useQuery } from '@tanstack/react-query';
import { ownerReviewsApi } from '../api/owner-reviews.api';
export const ownerReviewQueryKeys = {
    all: ['owner-reviews'],
    summary: (shopId, filters) => ['owner-reviews', 'summary', shopId, filters],
    services: (shopId, filters) => ['owner-reviews', 'services', shopId, filters],
    professionals: (shopId, filters) => ['owner-reviews', 'professionals', shopId, filters],
    feedbacks: (shopId, filters) => ['owner-reviews', 'feedbacks', shopId, filters],
};
export function useOwnerReviewSummary(shopId, filters = {}, options) {
    var _a;
    return useQuery({
        queryKey: ownerReviewQueryKeys.summary(shopId !== null && shopId !== void 0 ? shopId : '', filters),
        queryFn: () => {
            if (!shopId)
                throw new Error('shopId é obrigatório para carregar métricas.');
            return ownerReviewsApi.getSummary(shopId, filters);
        },
        enabled: Boolean(shopId) && ((_a = options === null || options === void 0 ? void 0 : options.enabled) !== null && _a !== void 0 ? _a : true),
        staleTime: 60 * 1000,
    });
}
export function useOwnerServiceMetrics(shopId, filters = {}, options) {
    var _a;
    return useQuery({
        queryKey: ownerReviewQueryKeys.services(shopId !== null && shopId !== void 0 ? shopId : '', filters),
        queryFn: () => {
            if (!shopId)
                throw new Error('shopId é obrigatório para carregar métricas de serviços.');
            return ownerReviewsApi.getServiceMetrics(shopId, filters);
        },
        enabled: Boolean(shopId) && ((_a = options === null || options === void 0 ? void 0 : options.enabled) !== null && _a !== void 0 ? _a : true),
        staleTime: 60 * 1000,
    });
}
export function useOwnerProfessionalMetrics(shopId, filters = {}, options) {
    var _a;
    return useQuery({
        queryKey: ownerReviewQueryKeys.professionals(shopId !== null && shopId !== void 0 ? shopId : '', filters),
        queryFn: () => {
            if (!shopId)
                throw new Error('shopId é obrigatório para carregar métricas de profissionais.');
            return ownerReviewsApi.getProfessionalMetrics(shopId, filters);
        },
        enabled: Boolean(shopId) && ((_a = options === null || options === void 0 ? void 0 : options.enabled) !== null && _a !== void 0 ? _a : true),
        staleTime: 60 * 1000,
    });
}
export function useOwnerFeedbacks(shopId, filters = {}, options) {
    var _a;
    return useQuery({
        queryKey: ownerReviewQueryKeys.feedbacks(shopId !== null && shopId !== void 0 ? shopId : '', filters),
        queryFn: () => {
            if (!shopId)
                throw new Error('shopId é obrigatório para carregar feedbacks.');
            return ownerReviewsApi.getFeedbacks(shopId, filters);
        },
        enabled: Boolean(shopId) && ((_a = options === null || options === void 0 ? void 0 : options.enabled) !== null && _a !== void 0 ? _a : true),
        staleTime: 30 * 1000,
    });
}
