import { httpClient } from '../../../shared/api/http-client';
import type {
  InvitationDto,
  FetchUserInvitationsResponse,
  AcceptedDto,
  DeclinedDto,
} from './invitations.dto';

export async function fetchUserInvitations(): Promise<InvitationDto[]> {
  const response = await httpClient.get<FetchUserInvitationsResponse>('/api/invitations');
  return response.invitations ?? [];
}

export async function getInvitation(invitationId: string): Promise<InvitationDto> {
  const response = await httpClient.get<{ invitation: InvitationDto }>(`/api/invitations/${invitationId}`);
  return response.invitation;
}

export async function acceptById(invitationId: string): Promise<AcceptedDto> {
  return httpClient.post<AcceptedDto>(`/api/invitations/${invitationId}/accept`);
}

export async function declineById(invitationId: string): Promise<DeclinedDto> {
  return httpClient.post<DeclinedDto>(`/api/invitations/${invitationId}/decline`);
}
