import { describe, it, expect } from 'vitest';
import {
  getOperationalContext,
  resolveEntryDestination,
  validateNewPassword,
} from '../model/operational-context';
import type { SessionSnapshot } from '../model/session-engine';

describe('Operational Context & Gates', () => {
  it.each(['OWNER', 'BARBER', 'CLIENT'] as const)(
    '%s with an authorized shop enters the existing operational home',
    (accountType) => {
      const snapshot: SessionSnapshot = {
        status: 'authenticated',
        identity: { id: 'user', name: 'Demo', email: 'demo@example.com', accountType, emailVerifiedAt: '2026-10-11T12:00:00.000Z' },
        memberships: [{ id: 'shop', name: 'Demo', role: 'OWNER', status: 'ACTIVE', timezone: 'America/Sao_Paulo' }],
        selectedShopId: 'shop', revocationPending: false, accessToken: 'fixture',
      };
      expect(resolveEntryDestination(snapshot)).toBe('/(app)');
    },
  );

  it('owner_canonical_intent_routes_to_barbershop_setup', () => {
    const snapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-owner-canonical',
        name: 'Carlos Owner',
        email: 'carlos@example.com',
        accountType: 'CLIENT', // Cadastrou como OWNER, mas servidor mantém CLIENT até criar a barbearia
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
        onboardingIntent: 'OWNER',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };

    const destination = resolveEntryDestination(snapshot);
    expect(destination).toBe('/(app)/barbershop-setup');
    expect(snapshot.identity?.accountType).toBe('CLIENT'); // Nenhuma permissão outorgada automaticamente
  });

  it('owner_legacy_intent_SETUP_BARBERSHOP_survives_verification', () => {
    const snapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-owner-legacy',
        name: 'Carlos Legacy',
        email: 'carlos@example.com',
        accountType: 'CLIENT',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
        onboardingIntent: 'SETUP_BARBERSHOP',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };

    const destination = resolveEntryDestination(snapshot);
    expect(destination).toBe('/(app)/barbershop-setup');
  });

  it('client_never_enters_owner_setup_by_default', () => {
    const snapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-client',
        name: 'Maria Cliente',
        email: 'maria@example.com',
        accountType: 'CLIENT',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
        onboardingIntent: null,
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };

    const destination = resolveEntryDestination(snapshot);
    expect(destination).toBe('/(client)');
  });

  it('barber_without_shop_has_no_operational_context', () => {
    const snapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-barber',
        name: 'João Barbeiro',
        email: 'joao@example.com',
        accountType: 'BARBER',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };

    const ctx = getOperationalContext(snapshot);
    expect(ctx).toBeNull();

    const destination = resolveEntryDestination(snapshot);
    expect(destination).toBe('/(account)/invitations');
  });

  it('owner_in_barber_membership_has_unit_permissions', () => {
    const snapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-1',
        name: 'Dono Trabalhando Como Barbeiro',
        email: 'dono@example.com',
        accountType: 'OWNER',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [
        {
          id: 'shop-filial',
          name: 'Filial 2',
          role: 'BARBERMAN',
          status: 'ACTIVE',
          state: 'ACTIVE',
          timezone: 'America/Sao_Paulo',
        },
      ],
      selectedShopId: 'shop-filial',
      revocationPending: false,
      accessToken: 'token',
    };

    const ctx = getOperationalContext(snapshot);
    expect(ctx).not.toBeNull();
    expect(ctx?.role).toBe('BARBERMAN');
  });

  it('new_password_unicode_limits', () => {
    // 7 emojis = 7 code points -> inválido (< 8)
    const pass7 = '😀'.repeat(7);
    expect(validateNewPassword(pass7).isValid).toBe(false);

    // 8 emojis = 8 code points (32 bytes UTF-8) -> válido (>= 8 code points e <= 72 bytes)
    const pass8 = '😀'.repeat(8);
    expect(validateNewPassword(pass8).isValid).toBe(true);

    // 72 caracteres ASCII (72 bytes) -> válido
    const pass72 = 'a'.repeat(72);
    expect(validateNewPassword(pass72).isValid).toBe(true);

    // 73 caracteres ASCII (73 bytes) -> inválido (> 72 bytes)
    const pass73 = 'a'.repeat(73);
    expect(validateNewPassword(pass73).isValid).toBe(false);
  });

  it('diferencia status da unidade de state do vínculo (falha fechado para vínculo não ativo)', () => {
    // Unidade INACTIVE mas vínculo ACTIVE -> contexto existe com unitStatus: 'INACTIVE'
    const inactiveUnitSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-1',
        name: 'Barbeiro',
        email: 'barber@example.com',
        accountType: 'BARBER',
        emailVerifiedAt: '2026-10-11T12:00:00.000Z',
      },
      memberships: [
        {
          id: 'shop-closed',
          name: 'Barbearia Fechada',
          role: 'BARBERMAN',
          status: 'INACTIVE',
          state: 'ACTIVE',
          timezone: 'America/Sao_Paulo',
        },
      ],
      selectedShopId: 'shop-closed',
      revocationPending: false,
      accessToken: 'token',
    };

    const ctx = getOperationalContext(inactiveUnitSnapshot);
    expect(ctx).not.toBeNull();
    expect(ctx?.unitStatus).toBe('INACTIVE');
    expect(ctx?.role).toBe('BARBERMAN');

    // Vínculo PENDING ou INACTIVE -> falha fechado (retorna null)
    const pendingMembershipSnapshot: SessionSnapshot = {
      ...inactiveUnitSnapshot,
      memberships: [
        {
          id: 'shop-closed',
          name: 'Barbearia Fechada',
          role: 'BARBERMAN',
          status: 'ACTIVE',
          state: 'PENDING',
          timezone: 'America/Sao_Paulo',
        },
      ],
    };
    expect(getOperationalContext(pendingMembershipSnapshot)).toBeNull();

    // Vínculo sem state (undefined) -> falha fechado (retorna null, sem fallback automático)
    const missingStateSnapshot: SessionSnapshot = {
      ...inactiveUnitSnapshot,
      memberships: [
        {
          id: 'shop-closed',
          name: 'Barbearia Fechada',
          role: 'BARBERMAN',
          status: 'ACTIVE',
          state: undefined,
          timezone: 'America/Sao_Paulo',
        },
      ],
    };
    expect(getOperationalContext(missingStateSnapshot)).toBeNull();
  });
});
