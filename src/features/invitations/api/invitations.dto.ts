export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';

export interface InvitationDto {
  id: string;
  barbershopId: string;
  barbershopName?: string;
  email: string;
  role: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt?: string | null;
}

export interface FetchUserInvitationsResponse {
  invitations: InvitationDto[];
}

export interface AcceptedDto {
  accepted: boolean;
  invitationId: string;
  barbershopId?: string;
  barbermanId?: string;
  status: 'ACCEPTED';
}

export interface DeclinedDto {
  declined: boolean;
  invitationId: string;
  status: 'DECLINED';
}
