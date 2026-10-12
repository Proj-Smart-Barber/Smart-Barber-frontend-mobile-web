import { describe, it, expect } from 'vitest';
import type { BookingDto } from '../api/bookings.dto';
import { isUpcomingBooking, isTerminalStatus, parseBookingStartTimeMs } from '../lib/booking-time';
import { AGENDA_QUERY_KEYS } from '../../agenda/api/agenda.api';
import type { AgendaScope } from '../../agenda/api/agenda.contract';

describe('R4 Bookings Pagination, Temporal Classification & Cache Isolation', () => {
  it('deduplicates 21 items loaded across 2 pages of 20 with overlap', () => {
    // Simula página 1 com 20 itens (id-1 a id-20)
    const page1: BookingDto[] = Array.from({ length: 20 }, (_, i) => ({
      id: `booking-${i + 1}`,
      barbershopId: 'shop-1',
      barbermanId: 'barber-1',
      services: [{ title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
      status: 'CONFIRMED',
      date: '2026-10-15',
      startTime: '10:00',
    }));

    // Simula página 2 com 2 itens: booking-20 (duplicado) e booking-21 (novo)
    const page2: BookingDto[] = [
      {
        id: 'booking-20',
        barbershopId: 'shop-1',
        barbermanId: 'barber-1',
        services: [{ title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
        status: 'CONFIRMED',
        date: '2026-10-15',
        startTime: '10:00',
      },
      {
        id: 'booking-21',
        barbershopId: 'shop-1',
        barbermanId: 'barber-1',
        services: [{ title: 'Barba', priceInCents: 3500, durationInMinutes: 20 }],
        status: 'CONFIRMED',
        date: '2026-10-16',
        startTime: '11:00',
      },
    ];

    const pages = [page1, page2];
    const seen = new Set<string>();
    const deduplicated: BookingDto[] = [];

    for (const page of pages) {
      for (const item of page) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deduplicated.push(item);
        }
      }
    }

    expect(deduplicated).toHaveLength(21);
    expect(deduplicated.map((b) => b.id)).toContain('booking-1');
    expect(deduplicated.map((b) => b.id)).toContain('booking-20');
    expect(deduplicated.map((b) => b.id)).toContain('booking-21');
  });

  it('classifies upcoming vs past and ignores terminal statuses for next booking', () => {
    const referenceNowMs = Date.parse('2026-10-15T12:00:00.000Z');

    const futureConfirmed: BookingDto = {
      id: 'b-future',
      barbershopId: 'shop-1',
      barbermanId: 'barber-1',
      services: [{ title: 'Corte' }],
      status: 'CONFIRMED',
      startsAt: '2026-10-15T14:00:00.000Z',
    };

    const futureCancelled: BookingDto = {
      id: 'b-cancelled',
      barbershopId: 'shop-1',
      barbermanId: 'barber-1',
      services: [{ title: 'Corte' }],
      status: 'CANCELLED',
      startsAt: '2026-10-15T15:00:00.000Z',
    };

    const futureCompleted: BookingDto = {
      id: 'b-completed',
      barbershopId: 'shop-1',
      barbermanId: 'barber-1',
      services: [{ title: 'Corte' }],
      status: 'COMPLETED',
      startsAt: '2026-10-15T16:00:00.000Z',
    };

    const pastConfirmed: BookingDto = {
      id: 'b-past',
      barbershopId: 'shop-1',
      barbermanId: 'barber-1',
      services: [{ title: 'Corte' }],
      status: 'CONFIRMED',
      startsAt: '2026-10-15T10:00:00.000Z',
    };

    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('COMPLETED')).toBe(true);
    expect(isTerminalStatus('NO_SHOW')).toBe(true);
    expect(isTerminalStatus('CONFIRMED')).toBe(false);

    expect(isUpcomingBooking(futureConfirmed, referenceNowMs)).toBe(true);
    expect(isUpcomingBooking(futureCancelled, referenceNowMs)).toBe(false);
    expect(isUpcomingBooking(futureCompleted, referenceNowMs)).toBe(false);
    expect(isUpcomingBooking(pastConfirmed, referenceNowMs)).toBe(false);
  });

  it('isolates agenda query keys across distinct shops, roles, and staff members', () => {
    const scopeBarberShop1: AgendaScope = {
      role: 'BARBER',
      staffId: 'staff-1',
      shopId: 'shop-1',
    };

    const scopeBarberShop2: AgendaScope = {
      role: 'BARBER',
      staffId: 'staff-1',
      shopId: 'shop-2',
    };

    const scopeOwnerShop1: AgendaScope = {
      role: 'OWNER',
      staffId: 'owner-1',
      shopId: 'shop-1',
    };

    const key1 = AGENDA_QUERY_KEYS.day(scopeBarberShop1, '2026-10-15');
    const key2 = AGENDA_QUERY_KEYS.day(scopeBarberShop2, '2026-10-15');
    const key3 = AGENDA_QUERY_KEYS.day(scopeOwnerShop1, '2026-10-15');

    expect(key1).toEqual(['agenda', 'day', 'shop-1', 'BARBER', 'staff-1', '2026-10-15']);
    expect(key2).toEqual(['agenda', 'day', 'shop-2', 'BARBER', 'staff-1', '2026-10-15']);
    expect(key3).toEqual(['agenda', 'day', 'shop-1', 'OWNER', 'owner-1', '2026-10-15']);

    expect(key1).not.toEqual(key2);
    expect(key1).not.toEqual(key3);
  });
});
