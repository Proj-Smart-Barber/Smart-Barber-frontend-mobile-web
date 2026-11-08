// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { resolveEntryDestination } from '../model/operational-context';
import type { SessionSnapshot } from '../model/session-engine';
import {
  setBookingReturnIntent,
  getBookingReturnIntent,
  clearBookingReturnIntent,
} from '../model/booking-return-intent';

// Mock expo-router
const redirectCalls: string[] = [];
vi.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    redirectCalls.push(href);
    return <div data-testid="redirect" data-href={href} />;
  },
  useRouter: () => ({
    replace: vi.fn((route: string) => {
      redirectCalls.push(route);
    }),
  }),
  useSegments: () => ['(client)'],
}));

import ClientIndexScreen from '@/app/(client)/index';

describe('N1 — Entrada em Explorar e compatibilidade do Início', () => {
  beforeEach(() => {
    redirectCalls.length = 0;
    clearBookingReturnIntent();
  });

  const createClientSnapshot = (): SessionSnapshot => ({
    status: 'authenticated',
    identity: {
      id: 'client-user-1',
      name: 'Cliente Teste',
      email: 'cliente@test.com',
      accountType: 'CLIENT',
      emailVerifiedAt: '2026-11-08T12:00:00.000Z',
      onboardingIntent: null,
    },
    memberships: [],
    selectedShopId: null,
    revocationPending: false,
    accessToken: 'test-token',
  });

  it('client_default_enters_explore', () => {
    const snapshot = createClientSnapshot();
    const destination = resolveEntryDestination(snapshot);
    expect(destination).toBe('/(client)/explore');
  });

  it('legacy_home_option_enters_explore', () => {
    const snapshot = createClientSnapshot();
    expect(resolveEntryDestination(snapshot, null, { clientEntry: 'home' })).toBe('/(client)/explore');
    expect(resolveEntryDestination(snapshot, null, { clientEntry: 'explore' })).toBe('/(client)/explore');
  });

  it('legacy_client_index_replaces_without_discovery_queries', () => {
    const { getByTestId } = render(<ClientIndexScreen />);
    const redirectEl = getByTestId('redirect');
    expect(redirectEl.getAttribute('data-href')).toBe('/(client)/explore');
    expect(redirectCalls).toContain('/(client)/explore');
  });

  it('booking_return_intent_has_priority', () => {
    setBookingReturnIntent({ shopId: 'shop-vip', draftId: 'draft-123' });
    const intent = getBookingReturnIntent();
    expect(intent).not.toBeNull();
    expect(intent?.returnPath).toBe('/barbershops/shop-vip/book');
  });

  it('role_and_membership_destinations_are_preserved', () => {
    const platformAdminSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'admin-1',
        name: 'Admin',
        email: 'admin@platform.com',
        accountType: 'PLATFORM_ADMIN',
        emailVerifiedAt: '2026-11-08T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };
    expect(resolveEntryDestination(platformAdminSnapshot, null, { clientEntry: 'home' })).toBe('/(platform)');

    const ownerWithIntentSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'owner-intent',
        name: 'Owner Intent',
        email: 'owner@test.com',
        accountType: 'CLIENT',
        onboardingIntent: 'OWNER',
        emailVerifiedAt: '2026-11-08T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };
    expect(resolveEntryDestination(ownerWithIntentSnapshot, null, { clientEntry: 'home' })).toBe('/(app)/barbershop-setup');

    const ownerNoShopSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'owner-no-shop',
        name: 'Owner No Shop',
        email: 'owner2@test.com',
        accountType: 'OWNER',
        emailVerifiedAt: '2026-11-08T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };
    expect(resolveEntryDestination(ownerNoShopSnapshot, null, { clientEntry: 'home' })).toBe('/(app)/barbershop-setup');

    const barberNoShopSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'barber-no-shop',
        name: 'Barber No Shop',
        email: 'barber@test.com',
        accountType: 'BARBER',
        emailVerifiedAt: '2026-11-08T12:00:00.000Z',
      },
      memberships: [],
      selectedShopId: null,
      revocationPending: false,
      accessToken: 'token',
    };
    expect(resolveEntryDestination(barberNoShopSnapshot, null, { clientEntry: 'home' })).toBe('/(account)/invitations');

    const memberSnapshot: SessionSnapshot = {
      status: 'authenticated',
      identity: {
        id: 'member-1',
        name: 'Barbeiro Membro',
        email: 'member@test.com',
        accountType: 'BARBER',
        emailVerifiedAt: '2026-11-08T12:00:00.000Z',
      },
      memberships: [
        {
          id: 'shop-active',
          name: 'Barbearia Top',
          role: 'BARBERMAN',
          status: 'ACTIVE',
          timezone: 'America/Sao_Paulo',
        },
      ],
      selectedShopId: 'shop-active',
      revocationPending: false,
      accessToken: 'token',
    };
    expect(resolveEntryDestination(memberSnapshot, null, { clientEntry: 'home' })).toBe('/(app)');
  });
});
