import { invalidateCatalogConsumers } from '../../../shared/cache/catalog-invalidation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../auth';
import { bookingQueryKeys } from '../../bookings/model/booking-query-keys';
import { teamApi } from '../api/team.api';
export function useTeamMembersQuery(shopId, state, page = 1) {
    const { identity } = useSession();
    const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
    return useQuery({
        queryKey: ['team', actorId, shopId, state, page],
        queryFn: () => {
            if (!shopId)
                throw new Error('Unidade não selecionada.');
            return teamApi.listTeamMembers(shopId, { state, page, limit: 20 });
        },
        enabled: Boolean(actorId && shopId),
        staleTime: 30000,
    });
}
export function useTeamInvitationsQuery(shopId, page = 1) {
    const { identity } = useSession();
    const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
    return useQuery({
        queryKey: ['team-invitations', actorId, shopId, page],
        queryFn: () => {
            if (!shopId)
                throw new Error('Unidade não selecionada.');
            return teamApi.listInvitations(shopId, { page, limit: 20 });
        },
        enabled: Boolean(actorId && shopId),
        staleTime: 30000,
    });
}
export function useTeamMemberQuery(shopId, membershipId) {
    const { identity } = useSession();
    const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
    return useQuery({
        queryKey: ['team-member', actorId, shopId, membershipId],
        queryFn: () => {
            if (!shopId || !membershipId)
                throw new Error('Parâmetros inválidos.');
            return teamApi.getTeamMember(shopId, membershipId);
        },
        enabled: Boolean(actorId && shopId && membershipId),
        staleTime: 30000,
    });
}
export function useCreateBarberRegistrationMutation() {
    const queryClient = useQueryClient();
    const { identity, selectedShopId } = useSession();
    const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
    return useMutation({
        mutationFn: ({ shopId, payload, idempotencyKey }) => {
            return teamApi.createBarberRegistration(shopId, payload, idempotencyKey);
        },
        onSuccess: (_data, variables) => {
            const targetShopId = variables.shopId || selectedShopId;
            if (actorId && targetShopId) {
                void invalidateCatalogConsumers(queryClient, targetShopId);
                queryClient.invalidateQueries({
                    queryKey: ['team-invitations', actorId, targetShopId],
                });
                queryClient.invalidateQueries({
                    queryKey: ['team', actorId, targetShopId],
                });
            }
        },
    });
}
export function useDeactivateMemberMutation() {
    const queryClient = useQueryClient();
    const { identity, selectedShopId } = useSession();
    const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
    return useMutation({
        mutationFn: ({ shopId, membershipId, expectedVersion, idempotencyKey }) => {
            return teamApi.deactivateMember(shopId, membershipId, expectedVersion, idempotencyKey);
        },
        onSuccess: (_data, variables) => {
            const targetShopId = variables.shopId || selectedShopId;
            if (actorId && targetShopId) {
                void invalidateCatalogConsumers(queryClient, targetShopId);
                queryClient.invalidateQueries({
                    queryKey: ['team', actorId, targetShopId],
                });
                queryClient.invalidateQueries({
                    queryKey: ['team-member', actorId, targetShopId, variables.membershipId],
                });
                queryClient.invalidateQueries({
                    queryKey: bookingQueryKeys.professionals(targetShopId),
                });
            }
        },
    });
}
export function useResendInvitationMutation() {
    const queryClient = useQueryClient();
    const { identity, selectedShopId } = useSession();
    const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
    return useMutation({
        mutationFn: ({ shopId, invitationId, idempotencyKey }) => {
            return teamApi.resendInvitation(shopId, invitationId, idempotencyKey);
        },
        onSuccess: (_data, variables) => {
            const targetShopId = variables.shopId || selectedShopId;
            if (actorId && targetShopId) {
                queryClient.invalidateQueries({
                    queryKey: ['team-invitations', actorId, targetShopId],
                });
            }
        },
    });
}
export function useRevokeInvitationMutation() {
    const queryClient = useQueryClient();
    const { identity, selectedShopId } = useSession();
    const actorId = identity === null || identity === void 0 ? void 0 : identity.id;
    return useMutation({
        mutationFn: ({ shopId, invitationId, idempotencyKey }) => {
            return teamApi.revokeInvitation(shopId, invitationId, idempotencyKey);
        },
        onSuccess: (_data, variables) => {
            const targetShopId = variables.shopId || selectedShopId;
            if (actorId && targetShopId) {
                queryClient.invalidateQueries({
                    queryKey: ['team-invitations', actorId, targetShopId],
                });
            }
        },
    });
}
