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

  it('busca agendamentos de hoje via rota canônica da unidade e mapeia preços, durações e horários', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        serverTime: '2026-10-13T12:00:00.000Z',
        items: [
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
            status: 'CONFIRMED',
          },
        ],
        page: 1,
        limit: 100,
        total: 1,
        hasNext: false,
      }),
    } as Response);

    const adapter = new DashboardHttpAdapter();
    const appointments = await adapter.getTodayAppointments({ role: 'OWNER', staffId: 'barber-1', shopId: 'shop-1' });

    expect(appointments).toHaveLength(1);
    expect(appointments[0].customerName).toBe('Carlos Silva');
    expect(appointments[0].servicePriceInCents).toBe(4500);
    expect(appointments[0].durationMinutes).toBe(30);
    expect(appointments[0].scheduledTime).toBe('10:00');
    expect(appointments[0].status).toBe('CONFIRMED');
    expect(appointments[0].hasIncompleteData).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/barbershops/shop-1/bookings?'),
      expect.anything(),
    );
  });

  it('mapeia status ausente para UNKNOWN e sinaliza hasIncompleteData quando preço ou duração são nulos', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        serverTime: '2026-10-13T12:00:00.000Z',
        items: [
          {
            id: 'bk-weird',
            barbershopId: 'shop-1',
            barbermanId: 'barber-1',
            customer: { id: 'c-1', name: 'Cliente Sem Preco' },
            services: [
              { id: 's-1', title: 'Serviço Personalizado', priceInCents: null, durationInMinutes: null },
            ],
            date: '2026-09-27',
            startTime: '11:00',
            status: 'CUSTOM_STATUS_FROM_LEGACY',
          },
        ],
        page: 1,
        limit: 100,
        total: 1,
        hasNext: false,
      }),
    } as Response);

    const adapter = new DashboardHttpAdapter();
    const appointments = await adapter.getTodayAppointments({ role: 'OWNER', staffId: 'barber-1', shopId: 'shop-1' });

    expect(appointments).toHaveLength(1);
    expect(appointments[0].status).toBe('UNKNOWN');
    expect(appointments[0].hasIncompleteData).toBe(true);
  });

  it('calcula métricas reais baseadas nos agendamentos retornados da API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        serverTime: '2026-10-13T12:00:00.000Z',
        items: [
          {
            id: 'bk-1',
            barbershopId: 'shop-1',
            barbermanId: 'barber-1',
            customer: { id: 'c-1', name: 'Cliente 1' },
            services: [{ id: 's-1', title: 'Corte', priceInCents: 5000, durationInMinutes: 30 }],
            date: '2026-09-27',
            startTime: '09:00',
            status: 'COMPLETED',
          },
          {
            id: 'bk-2',
            barbershopId: 'shop-1',
            barbermanId: 'barber-1',
            customer: { id: 'c-2', name: 'Cliente 2' },
            services: [{ id: 's-2', title: 'Barba', priceInCents: 3500, durationInMinutes: 20 }],
            date: '2026-09-27',
            startTime: '10:00',
            status: 'CONFIRMED',
          },
        ],
        page: 1,
        limit: 100,
        total: 2,
        hasNext: false,
      }),
    } as Response);

    const adapter = new DashboardHttpAdapter();
    const metrics = await adapter.getMetrics({ role: 'OWNER', staffId: 'barber-1', shopId: 'shop-1' });

    expect(metrics.totalAppointments).toBe(2);
    expect(metrics.totalRevenueInCents).toBe(8500);
    expect(metrics.completedAppointments).toBe(1);
    expect(metrics.hasIncompleteData).toBe(false);
  });

  it('rejeita cancelamento e atualização de status desprotegidos sem versão na dashboard', async () => {
    const adapter = new DashboardHttpAdapter();
    await expect(adapter.updateAppointmentStatus('bk-999', 'CANCELLED')).rejects.toThrow(
      'Ações de status e cancelamento devem ser realizadas pela Agenda operacional com controle de versão e idempotência.',
    );
    await expect(adapter.updateAppointmentStatus('bk-1', 'IN_SERVICE')).rejects.toThrow(
      'Ações de status e cancelamento devem ser realizadas pela Agenda operacional com controle de versão e idempotência.',
    );
  });
});
