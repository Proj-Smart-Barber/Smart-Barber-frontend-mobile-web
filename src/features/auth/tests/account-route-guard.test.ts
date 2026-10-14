import { describe, it, expect } from 'vitest';
import {
  getOperationalContext,
  resolveEntryDestination,
  resolveAccountDestination,
} from '../model/operational-context';
import type { SessionSnapshot } from '../model/session-engine';

describe('G1 — Governança de Sessão, Guards e Recursos de Conta', () => {
  it('usuário autenticado sem unidade acessa recursos de conta em (account) sem restrição de barbearia', () => {
    const clientSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'user-client-1',
        name: 'Cliente Sem Unidade',
        email: 'cliente@example.com',
        accountType: 'CLIENT',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };

    // Não tem contexto operacional
    expect(getOperationalContext(clientSnapshot)).toBeNull();

    // Destino padrão de entrada
    expect(resolveEntryDestination(clientSnapshot)).toBe('/(client)');

    // Destinos de conta são permitidos
    expect(resolveAccountDestination('/notifications')).toBe('/(account)/notifications');
    expect(resolveAccountDestination('/invitations')).toBe('/(account)/invitations');
    expect(resolveAccountDestination('/(account)/notifications/notif-123')).toBe(
      '/(account)/notifications/notif-123'
    );
  });

  it('cliente com intenção OWNER e sem unidade é roteado para /(app)/barbershop-setup sem loop', () => {
    const ownerIntentSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'user-owner-intent-1',
        name: 'Proprietário Pendente',
        email: 'proprietario@example.com',
        accountType: 'CLIENT',
        onboardingIntent: 'OWNER',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };

    expect(getOperationalContext(ownerIntentSnapshot)).toBeNull();
    expect(resolveEntryDestination(ownerIntentSnapshot)).toBe('/(app)/barbershop-setup');
  });

  it('barber sem unidade é roteado para (account)/invitations sem entrar em loop', () => {
    const barberSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'user-barber-1',
        name: 'Barbeiro Sem Loja',
        email: 'barber@example.com',
        accountType: 'BARBER',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };

    const destination = resolveEntryDestination(barberSnapshot);
    expect(destination).toBe('/(account)/invitations');
  });

  it('resolveAccountDestination sanitiza URLs externas e bloqueia redirects não autorizados', () => {
    expect(resolveAccountDestination('https://malicious.com')).toBe('/(account)/notifications');
    expect(resolveAccountDestination('//evil.com/phish')).toBe('/(account)/notifications');
    expect(resolveAccountDestination('javascript:alert(1)')).toBe('/(account)/notifications');
    expect(resolveAccountDestination('')).toBe('/(account)/notifications');
    expect(resolveAccountDestination(null)).toBe('/(account)/notifications');
  });

  it('resolveAccountDestination normaliza caminhos legados de (app) para (account)', () => {
    expect(resolveAccountDestination('/(app)/invitations')).toBe('/(account)/invitations');
    expect(resolveAccountDestination('/(app)/notifications')).toBe('/(account)/notifications');
    expect(resolveAccountDestination('/(app)/notifications/notif-99')).toBe(
      '/(account)/notifications/notif-99'
    );
  });

  it('resolveAccountDestination protege destinos operacionais se usuário não possuir unidade', () => {
    // Rota operacional protegida para usuário sem unidade redireciona para notifications de conta
    expect(resolveAccountDestination('/(app)/agenda', { hasUnit: false })).toBe(
      '/(account)/notifications'
    );
    // Mas se o usuário possuir unidade, o destino operacional é mantido
    expect(resolveAccountDestination('/(app)/agenda', { hasUnit: true })).toBe(
      '/(app)/agenda'
    );
  });

  it('getOperationalContext falha fechado com role desconhecido ou vínculo inativo', () => {
    const invalidRoleSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-1',
        name: 'Usuário',
        email: 'user@example.com',
        accountType: 'CLIENT',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [
        {
          id: 'shop-1',
          name: 'Loja',
          role: 'UNKNOWN_ROLE' as any,
          status: 'ACTIVE',
          timezone: 'America/Sao_Paulo',
        },
      ],
      selectedShopId: 'shop-1',
      revocationPending: false,
      accessToken: 'token',
    };

    expect(getOperationalContext(invalidRoleSnapshot)).toBeNull();

    const inactiveMembershipSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-2',
        name: 'Usuário Inativo',
        email: 'user2@example.com',
        accountType: 'BARBER',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [
        {
          id: 'shop-2',
          name: 'Loja 2',
          role: 'BARBERMAN',
          status: 'ACTIVE',
          state: 'INACTIVE' as any,
          timezone: 'America/Sao_Paulo',
        },
      ],
      selectedShopId: 'shop-2',
      revocationPending: false,
      accessToken: 'token',
    };

    expect(getOperationalContext(inactiveMembershipSnapshot)).toBeNull();
  });
});
