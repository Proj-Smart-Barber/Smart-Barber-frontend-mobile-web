import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingsHttpAdapter } from '../api/bookings.http';

describe('I5 — Contrato de Gestão de Atendimentos e Delegação Segura (bookings-management-contract)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('updateBooking nunca chama endpoint obsoleto /update e utiliza /reschedule com scope UNIT', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        booking: {
          id: 'b-mgmt-10',
          barbershopId: 'shop-xyz',
          barbermanId: 'barber-xyz',
          services: [],
          date: '2026-10-20T03:00:00.000Z',
          startTime: '15:00',
          endTime: '15:45',
          version: 2,
        },
      }),
    } as Response);

    const adapter = new BookingsHttpAdapter();
    const result = await adapter.updateBooking({
      bookingId: 'b-mgmt-10',
      date: '2026-10-20',
      startTime: '15:00',
      endTime: '15:45',
    });

    expect(result.id).toBe('b-mgmt-10');
    expect(result.startTime).toBe('15:00');

    // Verifica que NÃO chamou /update
    const calls = (global.fetch as any).mock.calls;
    expect(calls.length).toBe(1);
    const [url, options] = calls[0];

    expect(url).not.toContain('/update');
    expect(url).toContain('/api/bookings/b-mgmt-10/reschedule');
    expect(options.method).toBe('PATCH');

    const body = JSON.parse(options.body);
    expect(body).toEqual({
      date: '2026-10-20',
      startTime: '15:00',
      scope: 'UNIT',
    });
  });

  it('cancelBooking utiliza endpoint DELETE /api/bookings/:bookingId/cancel com scope UNIT', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        booking: {
          id: 'b-mgmt-10',
          barbershopId: 'shop-xyz',
          barbermanId: 'barber-xyz',
          services: [],
          date: '2026-10-20T03:00:00.000Z',
          startTime: '15:00',
          endTime: '15:45',
          status: 'CANCELLED',
        },
      }),
    } as Response);

    const adapter = new BookingsHttpAdapter();
    const result = await adapter.cancelBooking('b-mgmt-10');

    expect(result.id).toBe('b-mgmt-10');
    expect(result.status).toBe('CANCELLED');

    const calls = (global.fetch as any).mock.calls;
    expect(calls.length).toBe(1);
    const [url, options] = calls[0];

    expect(url).toContain('/api/bookings/b-mgmt-10/cancel');
    expect(options.method).toBe('DELETE');
  });
});
