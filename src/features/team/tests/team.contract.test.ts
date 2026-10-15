import { describe, expect, it } from 'vitest';
import {
  createBarberRegistrationPayloadSchema,
  deactivateMemberPayloadSchema,
  listTeamResponseSchema,
  listInvitationsResponseSchema,
} from '../api/team.contract';

describe('Team Contracts & Schemas', () => {
  describe('createBarberRegistrationPayloadSchema', () => {
    it('deve aceitar payload válido com CPF limpo ou formatado e email válido', () => {
      const validPayload = {
        name: 'Carlos Barbeiro',
        cpf: '12345678901',
        email: 'carlos@exemplo.com',
      };

      const result = createBarberRegistrationPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar se faltar nome ou nome muito curto', () => {
      const invalidPayload = {
        name: 'A',
        cpf: '12345678901',
        email: 'carlos@exemplo.com',
      };

      const result = createBarberRegistrationPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar email inválido', () => {
      const invalidPayload = {
        name: 'Carlos Barbeiro',
        cpf: '12345678901',
        email: 'email-invalido',
      };

      const result = createBarberRegistrationPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar CPF com formato ou tamanho inválido', () => {
      const invalidPayload = {
        name: 'Carlos Barbeiro',
        cpf: '123',
        email: 'carlos@exemplo.com',
      };

      const result = createBarberRegistrationPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('deactivateMemberPayloadSchema', () => {
    it('deve exigir expectedVersion inteiro maior ou igual a 0', () => {
      expect(deactivateMemberPayloadSchema.safeParse({ expectedVersion: 1 }).success).toBe(true);
      expect(deactivateMemberPayloadSchema.safeParse({ expectedVersion: 0 }).success).toBe(true);
      expect(deactivateMemberPayloadSchema.safeParse({ expectedVersion: -1 }).success).toBe(false);
      expect(deactivateMemberPayloadSchema.safeParse({ expectedVersion: 1.5 }).success).toBe(false);
    });
  });

  describe('listTeamResponseSchema', () => {
    it('deve aceitar resposta com lista de membros vazia ou preenchida', () => {
      const validResponse = {
        members: [
          {
            membershipId: 'mem-1',
            userId: 'user-1',
            name: 'João Silva',
            role: 'BARBERMAN',
            state: 'ACTIVE',
            version: 1,
            joinedAt: '2026-10-01T10:00:00Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      };

      const result = listTeamResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('listInvitationsResponseSchema', () => {
    it('deve aceitar resposta com convites pendentes e campos opcionais', () => {
      const validResponse = {
        items: [
          {
            id: 'inv-1',
            email: 'convidado@barber.com',
            role: 'BARBERMAN',
            status: 'PENDING',
            expiresAt: '2026-10-20T10:00:00Z',
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
        serverTime: '2026-10-15T12:00:00Z',
      };

      const result = listInvitationsResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });
});
