import { describe, it, expect } from 'vitest';
import { mapStaffDtoToEntity, mapSessionDtoToGrant, mapMeResponseToIdentity } from '../api/auth.mapper';

describe('mapStaffDtoToEntity', () => {
  it('deve mapear DTO com role OWNER corretamente', () => {
    const dto = {
      id: 'uuid-123',
      name: 'Carlos Silva',
      email: 'owner@smartbarber.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'OWNER',
    };

    const entity = mapStaffDtoToEntity(dto);
    expect(entity).toEqual({
      id: 'uuid-123',
      name: 'Carlos Silva',
      email: 'owner@smartbarber.com',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'OWNER',
    });
  });

  it('deve normalizar role BARBERMAN para BARBER e tratar avatarUrl ausente como null', () => {
    const dto = {
      id: 'uuid-456',
      name: 'João Barbeiro',
      email: 'barber@smartbarber.com',
      role: 'BARBERMAN',
    };

    const entity = mapStaffDtoToEntity(dto);
    expect(entity.role).toBe('BARBER');
    expect(entity.avatarUrl).toBeNull();
  });
});

describe('mapSessionDtoToGrant', () => {
  it('deve converter SessionDto em SessionGrant completo', () => {
    const grant = mapSessionDtoToGrant({
      access_token: 'acc-tok-123',
      refresh_token: 'ref-tok-456',
      serverTime: '2026-10-11T12:00:00.000Z',
    });

    expect(grant.accessToken).toBe('acc-tok-123');
    expect(grant.refreshToken).toBe('ref-tok-456');
    expect(grant.serverTime).toBe('2026-10-11T12:00:00.000Z');
    expect(grant.accessExpiresAt).toBeDefined();
    expect(grant.sessionExpiresAt).toBeDefined();
  });

  it('deve falhar se access_token estiver ausente', () => {
    expect(() => mapSessionDtoToGrant({ access_token: '' })).toThrow(
      'access_token ausente',
    );
  });
});

describe('mapMeResponseToIdentity', () => {
  it('deve mapear perfil com user e accountType corretamente', () => {
    const identity = mapMeResponseToIdentity({
      user: {
        id: 'u-1',
        name: 'Wellington Porto',
        email: 'well@example.com',
        accountType: 'OWNER',
        emailVerifiedAt: '2026-10-11T10:00:00.000Z',
        onboardingIntent: 'SETUP_BARBERSHOP',
      },
      staff: {
        id: 's-1',
        name: 'Wellington Staff',
        email: 'well@example.com',
        role: 'OWNER',
      },
    });

    expect(identity.id).toBe('u-1');
    expect(identity.accountType).toBe('OWNER');
    expect(identity.onboardingIntent).toBe('SETUP_BARBERSHOP');
    expect(identity.emailVerifiedAt).toBe('2026-10-11T10:00:00.000Z');
    expect(identity.staff?.role).toBe('OWNER');
  });

  it('deve rejeitar perfil sem accountType', () => {
    expect(() =>
      mapMeResponseToIdentity({
        user: {
          id: 'u-2',
          name: 'Sem papel',
          email: 'noprole@example.com',
        } as any,
      }),
    ).toThrow(/accountType é obrigatório/);
  });
});
