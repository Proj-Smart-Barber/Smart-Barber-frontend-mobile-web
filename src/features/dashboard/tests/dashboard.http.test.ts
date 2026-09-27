import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHttpAdapter } from '../api/dashboard.http';

describe('DashboardHttpAdapter', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('busca agendamentos de hoje e mapeia preços, durações e horários', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        bookings: [
          {
            id: 'bk-1',
            barbershopId: 'shop-1',
            barbermanId: 'barber-1',
            customer: { id: 'c-1', name: 'Carlos Silva', phoneNumber: '11999999999' },
            services: [
              { id: 's-1', title: 'Corte Social', priceInCents: 4500, durationInMinutes: 30 },
            ],
            date: '2026-09-27',
            startTime: '10:00',
            endTime: '10:30',
          },
        ],
      }),
    } as Response);

    const adapter = new DashboardHttpAdapter();
    const appointments = await adapter.getTodayAppointments({ role: 'OWNER', staffId: 'barber-1' });

    expect(appointments).toHaveLength(1);
    expect(appointments[0].customerName).toBe('Carlos Silva');
    expect(appointments[0].servicePriceInCents).toBe(4500);
    expect(appointments[0].durationMinutes).toBe(30);
    expect(appointments[0].scheduledTime).toBe('10:00');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bookings/barberman/schedule/details?date='),
      expect.anything(),
    );
  });

  it('calcula métricas reais baseadas nos agendamentos retornados da API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        bookings: [
          {
            id: 'bk-1',
            customer: { name: 'Cliente 1' },
            services: [{ id: 's-1', title: 'Corte', priceInCents: 5000 }],
            date: '2026-09-27',
            startTime: '09:00',
            endTime: '09:40',
          },
          {
            id: 'bk-2',
            customer: { name: 'Cliente 2' },
            services: [{ id: 's-2', title: 'Barba', priceInCents: 3500 }],
            date: '2026-09-27',
            startTime: '10:00',
            endTime: '10:30',
          },
        ],
      }),
    } as Response);

    const adapter = new DashboardHttpAdapter();
    const metrics = await adapter.getMetrics({ role: 'OWNER', staffId: 'barber-1' });

    expect(metrics.totalAppointments).toBe(2);
    expect(metrics.totalRevenueInCents).toBe(8500);
  });

  it('executa DELETE /api/bookings/:id/cancel quando status for CANCELLED', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Booking cancelled' }),
    } as Response);

    const adapter = new DashboardHttpAdapter();
    const result = await adapter.updateAppointmentStatus('bk-999', 'CANCELLED');

    expect(result.status).toBe('CANCELLED');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bookings/bk-999/cancel'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('rejeita status não suportados pelo backend com erro claro', async () => {
    const adapter = new DashboardHttpAdapter();
    await expect(adapter.updateAppointmentStatus('bk-1', 'IN_SERVICE')).rejects.toThrow(
      'A API atual não suporta atualização de status para IN_SERVICE.',
    );
  });
});
