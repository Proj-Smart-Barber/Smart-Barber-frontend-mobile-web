import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/features/auth';
import { teamApi } from '../api/team.api';
import type {
  CreateBarberRegistrationPayload,
  CreateBarberRegistrationResponse,
  DeactivateMemberResponse,
  ListInvitationsResponse,
  ListTeamResponse,
  ResendInvitationResponse,
  RevokeInvitationResponse,
  TeamMemberDto,
} from '../api/team.contract';

export function useTeamMembersQuery(
  shopId: string | null | undefined,
  state: 'ACTIVE' | 'INACTIVE',
  page = 1,
) {
  const { identity } = useSession();
  const actorId = identity?.id;

  return useQuery<ListTeamResponse>({
    queryKey: ['team', actorId, shopId, state, page],
    queryFn: () => {
      if (!shopId) throw new Error('Unidade não selecionada.');
      return teamApi.listTeamMembers(shopId, { state, page, limit: 20 });
    },
    enabled: Boolean(actorId && shopId),
    staleTime: 30_000,
  });
}

export function useTeamInvitationsQuery(
  shopId: string | null | undefined,
  page = 1,
) {
  const { identity } = useSession();
  const actorId = identity?.id;

  return useQuery<ListInvitationsResponse>({
    queryKey: ['team-invitations', actorId, shopId, page],
    queryFn: () => {
      if (!shopId) throw new Error('Unidade não selecionada.');
      return teamApi.listInvitations(shopId, { page, limit: 20 });
    },
    enabled: Boolean(actorId && shopId),
    staleTime: 30_000,
  });
}

export function useTeamMemberQuery(
  shopId: string | null | undefined,
  membershipId: string | null | undefined,
) {
  const { identity } = useSession();
  const actorId = identity?.id;

  return useQuery<TeamMemberDto>({
    queryKey: ['team-member', actorId, shopId, membershipId],
    queryFn: () => {
      if (!shopId || !membershipId) throw new Error('Parâmetros inválidos.');
      return teamApi.getTeamMember(shopId, membershipId);
    },
    enabled: Boolean(actorId && shopId && membershipId),
    staleTime: 30_000,
  });
}

export function useCreateBarberRegistrationMutation() {
  const queryClient = useQueryClient();
  const { identity, selectedShopId } = useSession();
  const actorId = identity?.id;

  return useMutation<
    CreateBarberRegistrationResponse,
    Error,
    { shopId: string; payload: CreateBarberRegistrationPayload; idempotencyKey: string }
  >({
    mutationFn: ({ shopId, payload, idempotencyKey }) => {
      return teamApi.createBarberRegistration(shopId, payload, idempotencyKey);
    },
    onSuccess: (_data, variables) => {
      const targetShopId = variables.shopId || selectedShopId;
      if (actorId && targetShopId) {
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
  const actorId = identity?.id;

  return useMutation<
    DeactivateMemberResponse,
    any,
    {
      shopId: string;
      membershipId: string;
      expectedVersion: number;
      idempotencyKey: string;
    }
  >({
    mutationFn: ({ shopId, membershipId, expectedVersion, idempotencyKey }) => {
      return teamApi.deactivateMember(
        shopId,
        membershipId,
        expectedVersion,
        idempotencyKey,
      );
    },
    onSuccess: (_data, variables) => {
      const targetShopId = variables.shopId || selectedShopId;
      if (actorId && targetShopId) {
        queryClient.invalidateQueries({
          queryKey: ['team', actorId, targetShopId],
        });
        queryClient.invalidateQueries({
          queryKey: ['team-member', actorId, targetShopId, variables.membershipId],
        });
        queryClient.invalidateQueries({
          queryKey: ['barbershop-professionals', targetShopId],
        });
      }
    },
  });
}

export function useResendInvitationMutation() {
  const queryClient = useQueryClient();
  const { identity, selectedShopId } = useSession();
  const actorId = identity?.id;

  return useMutation<
    ResendInvitationResponse,
    any,
    { shopId: string; invitationId: string; idempotencyKey: string }
  >({
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
  const actorId = identity?.id;

  return useMutation<
    RevokeInvitationResponse,
    any,
    { shopId: string; invitationId: string; idempotencyKey?: string }
  >({
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
