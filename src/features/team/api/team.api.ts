import { httpClient } from '@/shared/api';
import type {
  CreateBarberRegistrationPayload,
  CreateBarberRegistrationResponse,
  DeactivateMemberResponse,
  ListInvitationsResponse,
  ListTeamResponse,
  ResendInvitationResponse,
  RevokeInvitationResponse,
  TeamMemberDto,
} from './team.contract';

export const teamApi = {
  async listTeamMembers(
    shopId: string,
    params: { state?: 'ACTIVE' | 'INACTIVE'; page?: number; limit?: number } = {},
  ): Promise<ListTeamResponse> {
    const query = new URLSearchParams();
    if (params.state) query.set('state', params.state);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = `/api/barbershops/${shopId}/team${qs ? `?${qs}` : ''}`;
    const response = await httpClient.get<ListTeamResponse>(url);
    const members = response.members?.length ? response.members : (response.items ?? []);
    return {
      ...response,
      members,
      items: members,
    };
  },

  async getTeamMember(shopId: string, membershipId: string): Promise<TeamMemberDto> {
    const response = await httpClient.get<{ member: TeamMemberDto }>(
      `/api/barbershops/${shopId}/team/${membershipId}`,
    );
    return response.member;
  },

  async deactivateMember(
    shopId: string,
    membershipId: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<DeactivateMemberResponse> {
    return httpClient.patch<DeactivateMemberResponse>(
      `/api/barbershops/${shopId}/team/${membershipId}/deactivation`,
      { expectedVersion },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
  },

  async listInvitations(
    shopId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ListInvitationsResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = `/api/barbershops/${shopId}/invitations${qs ? `?${qs}` : ''}`;
    const response = await httpClient.get<ListInvitationsResponse>(url);
    const items = response.items?.length ? response.items : (response.invitations ?? []);
    return {
      ...response,
      items,
      invitations: items,
    };
  },

  async createBarberRegistration(
    shopId: string,
    payload: CreateBarberRegistrationPayload,
    idempotencyKey: string,
  ): Promise<CreateBarberRegistrationResponse> {
    return httpClient.post<CreateBarberRegistrationResponse>(
      `/api/barbershops/${shopId}/barber-registrations`,
      payload,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
  },

  async resendInvitation(
    shopId: string,
    invitationId: string,
    idempotencyKey: string,
  ): Promise<ResendInvitationResponse> {
    return httpClient.post<ResendInvitationResponse>(
      `/api/barbershops/${shopId}/invitations/${invitationId}/resend`,
      {},
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
  },

  async revokeInvitation(
    shopId: string,
    invitationId: string,
    idempotencyKey?: string,
  ): Promise<RevokeInvitationResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return httpClient.delete<RevokeInvitationResponse>(
      `/api/barbershops/${shopId}/invitations/${invitationId}`,
      { headers },
    );
  },
};
