import { describe, it, expect, vi } from 'vitest';
import { bookingQueryKeys, invalidateBookingQueries } from '../model/booking-query-keys';
import type { QueryClient } from '@tanstack/react-query';

describe('Booking Query Keys & Invalidation Contract', () => {
  it('generates isolated query keys containing actorId, shopId, and scope', () => {
    const myAnon = bookingQueryKeys.myBookings();
    const myActor1 = bookingQueryKeys.myBookings('actor-1', { page: 1 });
    const myActor2 = bookingQueryKeys.myBookings('actor-2', { page: 1 });

    expect(myAnon).toEqual(['bookings', 'me', 'anon', {}]);
    expect(myActor1).toEqual(['bookings', 'me', 'actor-1', { page: 1 }]);
    expect(myActor2).toEqual(['bookings', 'me', 'actor-2', { page: 1 }]);
    expect(myActor1).not.toEqual(myActor2);

    const unit1 = bookingQueryKeys.unitBookings('shop-1', { page: 1, limit: 20 });
    const unit2 = bookingQueryKeys.unitBookings('shop-2', { page: 1, limit: 20 });
    expect(unit1).toEqual(['barbershop', 'shop-1', 'bookings', { page: 1, limit: 20 }]);
    expect(unit2).toEqual(['barbershop', 'shop-2', 'bookings', { page: 1, limit: 20 }]);
    expect(unit1).not.toEqual(unit2);

    const detailPersonal = bookingQueryKeys.detail('b-1', 'PERSONAL');
    const detailUnit = bookingQueryKeys.detail('b-1', 'UNIT');
    expect(detailPersonal).toEqual(['bookings', 'detail', 'b-1', 'PERSONAL']);
    expect(detailUnit).toEqual(['bookings', 'detail', 'b-1', 'UNIT']);
  });

  it('invalidates affected availability, unit bookings, agenda, dashboard, and notifications', async () => {
    const invalidateQueriesMock = vi.fn().mockResolvedValue(undefined);
    const mockQueryClient = {
      invalidateQueries: invalidateQueriesMock,
    } as unknown as QueryClient;

    await invalidateBookingQueries(mockQueryClient, {
      actorId: 'user-123',
      shopId: 'shop-abc',
      bookingId: 'booking-999',
      oldProfessionalId: 'barber-old',
      newProfessionalId: 'barber-new',
      dates: ['2026-10-12', '2026-10-13'],
    });

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['bookings', 'me'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['bookings', 'detail', 'booking-999'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['barbershop', 'shop-abc', 'availability'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['barbershop', 'shop-abc', 'bookings'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['agenda', 'shop-abc'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['dashboard', 'shop-abc'],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['notifications', 'user-123'],
    });
  });
});
