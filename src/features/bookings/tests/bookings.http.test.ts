import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingsHttpAdapter } from '../api/bookings.http';

describe('BookingsHttpAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getDayBookings', () => {
    it('chama GET /api/bookings/barberman/schedule/details com a data e mapeia os bookings', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          bookings: [
            {
              id: 'booking-1',
              barbershopId: 'shop-uuid',
              barbermanId: 'barber-uuid',
              date: '2026-10-10T03:00:00.000Z',
              startTime: '09:00',
              endTime: '09:30',
              customer: { id: 'customer-1', name: 'Ana Pereira', phoneNumber: '(11) 99999-1234' },
              services: [
                { id: 'svc-1', title: 'Corte de cabelo', priceInCents: 6000, durationInMinutes: 30 },
              ],
            },
          ],
        }),
      } as Response);

      const adapter = new BookingsHttpAdapter();
      const bookings = await adapter.getDayBookings({ date: '2026-10-10' });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].id).toBe('booking-1');
      expect(bookings[0].date).toBe('2026-10-10');
      expect(bookings[0].startTime).toBe('09:00');
      expect(bookings[0].endTime).toBe('09:30');
      expect(bookings[0].customer.name).toBe('Ana Pereira');
      expect(bookings[0].services[0].durationInMinutes).toBe(30);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookings/barberman/schedule/details'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('date=2026-10-10'),
        expect.anything(),
      );
    });

    it('retorna lista vazia quando a resposta não traz bookings', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      } as Response);

      const adapter = new BookingsHttpAdapter();
      const bookings = await adapter.getDayBookings({ date: '2026-10-10' });

      expect(bookings).toEqual([]);
    });

    it('ordena os bookings cronologicamente pelo horário de início', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          bookings: [
            { id: 'b2', date: '2026-10-10', startTime: '14:00', endTime: '14:30' },
            { id: 'b1', date: '2026-10-10', startTime: '09:00', endTime: '09:30' },
          ],
        }),
      } as Response);

      const adapter = new BookingsHttpAdapter();
      const bookings = await adapter.getDayBookings({ date: '2026-10-10' });

      expect(bookings.map((b) => b.id)).toEqual(['b1', 'b2']);
    });
  });

  describe('updateBooking', () => {
    it('chama PATCH /api/bookings/:bookingId/update com data e horários', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          booking: {
            id: 'booking-1',
            date: '2026-10-10T03:00:00.000Z',
            startTime: '10:00',
            endTime: '10:30',
          },
        }),
      } as Response);

      const adapter = new BookingsHttpAdapter();
      const booking = await adapter.updateBooking({
        bookingId: 'booking-1',
        date: '2026-10-10',
        startTime: '10:00',
        endTime: '10:30',
      });

      expect(booking.id).toBe('booking-1');
      expect(booking.startTime).toBe('10:00');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookings/booking-1/update'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ date: '2026-10-10', startTime: '10:00', endTime: '10:30' }),
        }),
      );
    });

    it('rejeita quando a resposta não traz booking válido', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      } as Response);

      const adapter = new BookingsHttpAdapter();

      await expect(
        adapter.updateBooking({
          bookingId: 'booking-1',
          date: '2026-10-10',
          startTime: '10:00',
          endTime: '10:30',
        }),
      ).rejects.toThrow('Resposta inválida do servidor ao remarcar o agendamento.');
    });
  });

  describe('cancelBooking', () => {
    it('chama DELETE /api/bookings/:bookingId/cancel e mapeia o booking retornado', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          booking: {
            id: 'booking-1',
            date: '2026-10-10T03:00:00.000Z',
            startTime: '09:00',
            endTime: '09:30',
          },
        }),
      } as Response);

      const adapter = new BookingsHttpAdapter();
      const booking = await adapter.cancelBooking('booking-1');

      expect(booking.id).toBe('booking-1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/bookings/booking-1/cancel'),
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

      const adapter = new BookingsHttpAdapter();

      await expect(adapter.cancelBooking('booking-1')).rejects.toThrow(
        'Resposta inválida do servidor ao cancelar o agendamento.',
      );
    });
  });
});
