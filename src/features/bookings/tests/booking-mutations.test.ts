import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bookingsApi from '../api/bookings.api';
import { httpClient } from '@/shared/api';

describe('R3 — Mutações e Ações de Agendamento (Cancel, Reschedule, Status)', () => {
  const fakeBooking = {
    id: 'booking-abc',
    barbershopId: 'shop-alpha',
    barbermanId: 'barber-1',
    date: '2026-10-15T00:00:00.000Z',
    startTime: '10:00',
    status: 'CONFIRMED',
    version: 2,
    services: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancelBooking envia DELETE com Idempotency-Key, expectedVersion e scope', async () => {
    const deleteSpy = vi.spyOn(httpClient, 'delete').mockResolvedValue({
      booking: { ...fakeBooking, status: 'CANCELLED', version: 3 },
    } as any);

    const result = await bookingsApi.cancelBooking(
      'booking-abc',
      {
        scope: 'PERSONAL',
        expectedVersion: 2,
        reason: 'Imprevisto pessoal',
      },
      'key-cancel-123'
    );

    expect(deleteSpy).toHaveBeenCalledWith(
      '/api/bookings/booking-abc/cancel',
      {
        scope: 'PERSONAL',
        expectedVersion: 2,
        reason: 'Imprevisto pessoal',
      },
      {
        headers: { 'Idempotency-Key': 'key-cancel-123' },
      }
    );
    expect(result.booking.status).toBe('CANCELLED');
  });

  it('rescheduleBooking envia PATCH com Idempotency-Key, payload e expectedVersion', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({
      booking: { ...fakeBooking, startTime: '11:00', version: 3 },
    } as any);

    const result = await bookingsApi.rescheduleBooking(
      'booking-abc',
      {
        scope: 'PERSONAL',
        expectedVersion: 2,
        date: '2026-10-15',
        startTime: '11:00',
        barbermanId: 'barber-1',
        serviceIds: ['srv-1'],
      },
      'key-reschedule-123'
    );

    expect(patchSpy).toHaveBeenCalledWith(
      '/api/bookings/booking-abc/reschedule',
      expect.objectContaining({
        date: '2026-10-15',
        startTime: '11:00',
        expectedVersion: 2,
      }),
      {
        headers: { 'Idempotency-Key': 'key-reschedule-123' },
      }
    );
    expect(result.booking.startTime).toBe('11:00');
  });

  it('transitionBookingStatus envia transição COMPLETED ou NO_SHOW com Idempotency-Key', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue({
      booking: { ...fakeBooking, status: 'COMPLETED', version: 3 },
    } as any);

    const result = await bookingsApi.transitionBookingStatus(
      'booking-abc',
      {
        expectedVersion: 2,
        status: 'COMPLETED',
      },
      'key-status-123'
    );

    expect(patchSpy).toHaveBeenCalledWith(
      '/api/bookings/booking-abc/status',
      {
        expectedVersion: 2,
        status: 'COMPLETED',
      },
      {
        headers: { 'Idempotency-Key': 'key-status-123' },
      }
    );
    expect(result.booking.status).toBe('COMPLETED');
  });
});
