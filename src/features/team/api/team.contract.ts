import { z } from 'zod';

export const TeamMemberDtoSchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string().email().optional().nullable(),
  role: z.string(),
  state: z.enum(['ACTIVE', 'INACTIVE']),
  version: z.number().int(),
  joinedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export type TeamMemberDto = z.infer<typeof TeamMemberDtoSchema>;

export const ListTeamResponseSchema = z.object({
  items: z.array(TeamMemberDtoSchema).optional().default([]),
  members: z.array(TeamMemberDtoSchema).optional().default([]),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const listTeamResponseSchema = ListTeamResponseSchema;
export type ListTeamResponse = z.infer<typeof ListTeamResponseSchema>;

export const BarbershopInvitationDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED']),
  role: z.string(),
  expiresAt: z.string(),
  respondedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

export type BarbershopInvitationDto = z.infer<typeof BarbershopInvitationDtoSchema>;

export const ListInvitationsResponseSchema = z.object({
  items: z.array(BarbershopInvitationDtoSchema).optional().default([]),
  invitations: z.array(BarbershopInvitationDtoSchema).optional().default([]),
  page: z.number().int().default(1),
  limit: z.number().int().default(20),
  total: z.number().int().default(0),
  hasNext: z.boolean().default(false),
  serverTime: z.string().optional(),
});

export const listInvitationsResponseSchema = ListInvitationsResponseSchema;
export type ListInvitationsResponse = z.infer<typeof ListInvitationsResponseSchema>;

export const CreateBarberRegistrationPayloadSchema = z.object({
  name: z.string().min(2),
  cpf: z.string().transform((val) => val.replace(/\D/g, '')).pipe(z.string().length(11)),
  email: z.string().email(),
});

export const createBarberRegistrationPayloadSchema = CreateBarberRegistrationPayloadSchema;
export type CreateBarberRegistrationPayload = z.input<typeof CreateBarberRegistrationPayloadSchema>;

export const DeactivateMemberPayloadSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
});

export const deactivateMemberPayloadSchema = DeactivateMemberPayloadSchema;
export type DeactivateMemberPayload = z.infer<typeof DeactivateMemberPayloadSchema>;

export interface CreateBarberRegistrationResponse {
  registrationId: string;
  invitationId?: string;
  email: string;
  status?: 'PENDING';
  requiresExistingAccountLogin: boolean;
  expiresAt?: string;
}

export interface DeactivateMemberResponse {
  membershipId: string;
  state: 'INACTIVE';
  version: number;
  endedAt: string;
}

export interface ResendInvitationResponse {
  invitationId: string;
  sentAt?: string;
  expiresAt?: string;
  resendCooldownSeconds?: number;
}

export interface RevokeInvitationResponse {
  revoked?: boolean;
  invitationId: string;
  status: string;
}
