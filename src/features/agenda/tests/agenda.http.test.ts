import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingScheduleHttpAdapter } from '../api/agenda.http';

describe('BookingScheduleHttpAdapter.cancelBooking', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('chama DELETE /api/booking/:id/cancel e mapeia o booking retornado', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        booking: {
          id: 'booking-uuid',
          barbershopId: 'shop-uuid',
          barbermanId: 'barber-uuid',
          shoppingCartId: 'cart-uuid',
          date: '2026-09-12T03:00:00.000Z',
          startTime: '09:00',
          endTime: '09:30',
          createdAt: '2026-09-12T12:00:00.000Z',
        },
      }),
    } as Response);

    const adapter = new BookingScheduleHttpAdapter();
    const booking = await adapter.cancelBooking('booking-uuid');

    expect(booking.id).toBe('booking-uuid');
    expect(booking.startTime).toBe('09:00');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/booking/booking-uuid/cancel'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('rejeita quando a resposta não traz booking válido', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({}),
    } as Response);

    const adapter = new BookingScheduleHttpAdapter();

    await expect(adapter.cancelBooking('booking-uuid')).rejects.toThrow(
      'Resposta inválida do servidor ao cancelar o agendamento.',
    );
  });
});
