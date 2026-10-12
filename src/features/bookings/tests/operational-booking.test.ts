import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bookingsApi from '../api/bookings.api';
import { httpClient } from '@/shared/api';

describe('R3 — Agendamento Operacional na Unidade (UNIT Mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lookupCustomer rejeita envio simultâneo de email e cpf ou ambos ausentes', async () => {
    await expect(
      bookingsApi.lookupCustomer('shop-1', { email: 'a@b.com', cpf: '12345678901' })
    ).rejects.toThrow('Forneça exatamente um critério de busca');

    await expect(
      bookingsApi.lookupCustomer('shop-1', {})
    ).rejects.toThrow('Forneça exatamente um critério de busca');
  });

  it('lookupCustomer envia critério único sanitizado para POST /api/barbershops/:shopId/customers/lookup', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({
      id: 'cust-123',
      name: 'João Cliente',
      maskedEmail: 'j***@email.com',
      isEligible: true,
    } as any);

    const result = await bookingsApi.lookupCustomer('shop-1', { email: ' joao@email.com ' });

    expect(postSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-1/customers/lookup',
      { email: 'joao@email.com' }
    );
    expect(result.id).toBe('cust-123');
    expect(result.isEligible).toBe(true);
  });

  it('createOperationalBooking envia scope=UNIT, shopId e customerId no mesmo endpoint /api/bookings', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({
      booking: {
        id: 'booking-unit-1',
        barbershopId: 'shop-1',
        barbermanId: 'barber-1',
        date: '2026-10-15T00:00:00.000Z',
        startTime: '14:00',
        services: [{ id: 'srv-1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
      },
    } as any);

    const response = await bookingsApi.createOperationalBooking(
      'shop-1',
      {
        customerId: 'cust-123',
        serviceIds: ['srv-1'],
        barbermanId: 'barber-1',
        date: '2026-10-15',
        startTime: '14:00',
      },
      'key-uuid-123'
    );

    expect(postSpy).toHaveBeenCalledWith(
      '/api/bookings',
      expect.objectContaining({
        scope: 'UNIT',
        shopId: 'shop-1',
        customerId: 'cust-123',
        barbermanId: 'barber-1',
        serviceIds: ['srv-1'],
      }),
      {
        headers: { 'Idempotency-Key': 'key-uuid-123' },
      }
    );
    expect(response.booking.id).toBe('booking-unit-1');
  });
});
