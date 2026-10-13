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
      expect.stringContaining('/api/bookings/booking-uuid/cancel'),
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
      'Não foi possível cancelar o agendamento.',
    );
  });
});

describe('AgendaHttpAdapter.getAgendaDay', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses unit endpoint when shopId is present and maps statuses and prices accurately', async () => {
    const { AgendaHttpAdapter } = await import('../api/agenda.http');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        items: [
          {
            id: 'b-1',
            startTime: '10:00',
            endTime: '10:30',
            customer: { name: 'João Silva' },
            services: [{ title: 'Corte', priceInCents: 5000 }],
            status: 'COMPLETED',
            totalPriceInCents: 5000,
            barbermanId: 'barber-1',
          },
          {
            id: 'b-2',
            startTime: '11:00',
            endTime: '11:30',
            customer: { name: 'Carlos Lima' },
            services: [{ title: 'Barba' }],
            status: 'SOME_UNKNOWN_STATUS',
            totalPriceInCents: null,
            barbermanId: 'barber-1',
          },
        ],
        summary: {
          totalBookings: 2,
          totalRevenueInCents: 5000,
        },
        serverTime: '2026-10-12T09:00:00.000Z',
      }),
    } as Response);

    const adapter = new AgendaHttpAdapter();
    const day = await adapter.getAgendaDay({
      scope: { role: 'BARBER', staffId: 'barber-1', shopId: 'shop-uuid' },
      date: '2026-10-12',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/barbershops/shop-uuid/bookings?date=2026-10-12&limit=100&barbermanId=barber-1'),
      expect.anything()
    );

    expect(day.entries).toHaveLength(2);
    const [entry1, entry2] = day.entries as import('../api/agenda.contract').AgendaAppointmentEntry[];
    expect(entry1.status).toBe('COMPLETED');
    expect(entry1.servicePriceInCents).toBe(5000);

    // Status desconhecido não vira CONFIRMED, vira UNKNOWN
    expect(entry2.status).toBe('UNKNOWN');
    // Preço desconhecido não vira 0, vira null
    expect(entry2.servicePriceInCents).toBeNull();
  });
});

