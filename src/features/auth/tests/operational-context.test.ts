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

  it('owner_intent_survives_verification', () => {
    const snapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'u-owner',
        name: 'Carlos Owner',
        email: 'carlos@example.com',
        accountType: 'CLIENT', // Cadastrou com intenção mas ainda não criou barbearia
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
    expect(destination).toBe('/(app)/invitations');
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
    // 14 emojis = 14 code points -> inválido (< 15)
    const pass14 = '😀'.repeat(14);
    expect(validateNewPassword(pass14).isValid).toBe(false);

    // 15 emojis = 15 code points (60 bytes UTF-8) -> válido (>= 15 code points e <= 72 bytes)
    const pass15 = '😀'.repeat(15);
    expect(validateNewPassword(pass15).isValid).toBe(true);

    // 72 caracteres ASCII (72 bytes) -> válido
    const pass72 = 'a'.repeat(72);
    expect(validateNewPassword(pass72).isValid).toBe(true);

    // 73 caracteres ASCII (73 bytes) -> inválido (> 72 bytes)
    const pass73 = 'a'.repeat(73);
    expect(validateNewPassword(pass73).isValid).toBe(false);
  });
});
