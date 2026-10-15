import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api';
import { teamApi } from '../api/team.api';

describe('Team API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('listTeamMembers deve chamar GET com os parâmetros corretos', async () => {
    const mockResponse = {
      members: [
        {
          membershipId: 'mem-1',
          userId: 'usr-1',
          name: 'Barbeiro Teste',
          role: 'BARBERMAN',
          state: 'ACTIVE' as const,
          version: 1,
          joinedAt: '2026-10-15T10:00:00Z',
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    };

    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue(mockResponse);

    const result = await teamApi.listTeamMembers('shop-123', {
      state: 'ACTIVE',
      page: 1,
      limit: 20,
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-123/team?state=ACTIVE&page=1&limit=20',
    );
    expect(result.members.length).toBe(1);
    expect(result.items.length).toBe(1);
  });

  it('getTeamMember deve chamar GET /api/barbershops/:shopId/team/:membershipId', async () => {
    const mockMember = {
      membershipId: 'mem-1',
      userId: 'usr-1',
      name: 'Barbeiro Detalhe',
      role: 'BARBERMAN',
      state: 'ACTIVE' as const,
      version: 2,
      joinedAt: '2026-10-15T10:00:00Z',
    };

    const getSpy = vi
      .spyOn(httpClient, 'get')
      .mockResolvedValue({ member: mockMember });

    const result = await teamApi.getTeamMember('shop-123', 'mem-1');

    expect(getSpy).toHaveBeenCalledWith('/api/barbershops/shop-123/team/mem-1');
    expect(result.name).toBe('Barbeiro Detalhe');
    expect(result.version).toBe(2);
  });

  it('deactivateMember deve chamar PATCH com expectedVersion e Idempotency-Key', async () => {
    const mockDeactivateRes = {
      membershipId: 'mem-1',
      state: 'INACTIVE' as const,
      version: 3,
      endedAt: '2026-10-15T12:00:00Z',
    };

    const patchSpy = vi
      .spyOn(httpClient, 'patch')
      .mockResolvedValue(mockDeactivateRes);

    const result = await teamApi.deactivateMember(
      'shop-123',
      'mem-1',
      2,
      'idemp-key-xyz',
    );

    expect(patchSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-123/team/mem-1/deactivation',
      { expectedVersion: 2 },
      {
        headers: {
          'Idempotency-Key': 'idemp-key-xyz',
        },
      },
    );
    expect(result.state).toBe('INACTIVE');
  });

  it('createBarberRegistration deve chamar POST com Idempotency-Key e dados', async () => {
    const mockRes = {
      registrationId: 'reg-1',
      email: 'novo@barber.com',
      requiresExistingAccountLogin: false,
    };

    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue(mockRes);

    const payload = {
      name: 'Novo Barbeiro',
      cpf: '12345678901',
      email: 'novo@barber.com',
    };

    const result = await teamApi.createBarberRegistration(
      'shop-123',
      payload,
      'reg-idemp-123',
    );

    expect(postSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-123/barber-registrations',
      payload,
      {
        headers: {
          'Idempotency-Key': 'reg-idemp-123',
        },
      },
    );
    expect(result.registrationId).toBe('reg-1');
  });

  it('resendInvitation deve chamar POST com Idempotency-Key e body vazio', async () => {
    const mockRes = {
      invitationId: 'inv-1',
      email: 'teste@barber.com',
      expiresAt: '2026-10-22T10:00:00Z',
      resendCooldownSeconds: 60,
    };

    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue(mockRes);

    const result = await teamApi.resendInvitation(
      'shop-123',
      'inv-1',
      'resend-key-1',
    );

    expect(postSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-123/invitations/inv-1/resend',
      {},
      {
        headers: {
          'Idempotency-Key': 'resend-key-1',
        },
      },
    );
    expect(result.resendCooldownSeconds).toBe(60);
  });

  it('revokeInvitation deve chamar DELETE com Idempotency-Key opcional', async () => {
    const mockRes = {
      invitationId: 'inv-1',
      status: 'REVOKED' as const,
    };

    const deleteSpy = vi.spyOn(httpClient, 'delete').mockResolvedValue(mockRes);

    const result = await teamApi.revokeInvitation(
      'shop-123',
      'inv-1',
      'revoke-key-1',
    );

    expect(deleteSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-123/invitations/inv-1',
      {
        headers: {
          'Idempotency-Key': 'revoke-key-1',
        },
      },
    );
    expect(result.status).toBe('REVOKED');
  });
});
