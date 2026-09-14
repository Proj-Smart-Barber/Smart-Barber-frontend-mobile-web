import { describe, expect, it } from 'vitest';
import { DashboardMockAdapter, SEED_BARBER_ID } from '../api/dashboard.mock';

describe('DashboardMockAdapter', () => {
  const adapter = new DashboardMockAdapter();

  it('deve retornar métricas para perfil OWNER com visão consolidada', async () => {
    const metrics = await adapter.getMetrics({ role: 'OWNER', staffId: 'owner-1' });

    expect(metrics.totalRevenueInCents).toBeGreaterThan(0);
    expect(metrics.totalAppointments).toBeGreaterThan(0);
    expect(metrics.occupancyRatePercent).toBeGreaterThanOrEqual(0);
    expect(metrics.occupancyRatePercent).toBeLessThanOrEqual(100);
  });

  it('deve retornar métricas para perfil BARBER com comissão e atendimentos próprios', async () => {
    const metrics = await adapter.getMetrics({ role: 'BARBER', staffId: SEED_BARBER_ID });

    expect(metrics.estimatedCommissionInCents).toBeGreaterThan(0);
    expect(metrics.totalAppointments).toBeGreaterThan(0);
  });

  it('deve retornar lista completa de agendamentos de hoje para OWNER', async () => {
    const appointments = await adapter.getTodayAppointments({ role: 'OWNER', staffId: 'owner-1' });

    expect(appointments.length).toBeGreaterThan(0);
    expect(appointments[0]).toHaveProperty('customerName');
    expect(appointments[0]).toHaveProperty('serviceTitle');
    expect(appointments[0]).toHaveProperty('scheduledTime');
    expect(appointments[0]).toHaveProperty('status');
  });

  it('deve filtrar agendamentos para o BARBER específico', async () => {
    const appointments = await adapter.getTodayAppointments({ role: 'BARBER', staffId: SEED_BARBER_ID });

    expect(appointments.length).toBeGreaterThan(0);
    for (const app of appointments) {
      expect(app.barbermanId).toBe(SEED_BARBER_ID);
    }
  });

  it('deve permitir atualizar status de um agendamento', async () => {
    const appointments = await adapter.getTodayAppointments({ role: 'OWNER', staffId: 'owner-1' });
    const target = appointments[0];

    const updated = await adapter.updateAppointmentStatus(target.id, 'IN_SERVICE');
    expect(updated.status).toBe('IN_SERVICE');

    const refreshed = await adapter.getTodayAppointments({ role: 'OWNER', staffId: 'owner-1' });
    const found = refreshed.find((a) => a.id === target.id);
    expect(found?.status).toBe('IN_SERVICE');
  });
});
