import { describe, expect, it } from 'vitest';
import { DashboardHttpAdapter } from '../dashboard/api/dashboard.http';
import { AgendaHttpAdapter } from '../agenda/api/agenda.http';
import { ENV } from '@/shared/config/env';

describe('Demo Seed Frontend Integration Contracts', () => {
  it('garante que a configuração de ambiente está em modo HTTP por padrão', () => {
    // A especificação exige EXPO_PUBLIC_AVAILABILITY_SOURCE=http
    expect(ENV.AVAILABILITY_SOURCE).toBe('http');
  });

  it('mapeia agendamento da Barbearia Horizonte para o modelo de Dashboard', async () => {
    const originalFetch = global.fetch;

    global.fetch = async () =>
      new Response(
        JSON.stringify({
          bookings: [
            {
              id: 'horizonte-booking-1',
              barbershopId: 'horizonte-barbershop-id',
              barbermanId: 'wellington-id',
              customer: {
                id: 'lucas-id',
                name: 'Lucas Andrade',
                phoneNumber: '11911000001',
              },
              services: [
                {
                  id: 'corte-classico-id',
                  title: 'Corte clássico',
                  priceInCents: 4500,
                  durationInMinutes: 30,
                },
              ],
              date: '2026-09-28',
              startTime: '10:00',
              endTime: '10:30',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );

    try {
      const adapter = new DashboardHttpAdapter();
      const appointments = await adapter.getTodayAppointments({
        role: 'OWNER',
        staffId: 'wellington-id',
      });

      expect(appointments).toHaveLength(1);
      const appt = appointments[0];
      expect(appt.customerName).toBe('Lucas Andrade');
      expect(appt.serviceTitle).toBe('Corte clássico');
      expect(appt.servicePriceInCents).toBe(4500);
      expect(appt.durationMinutes).toBe(30);
      expect(appt.scheduledTime).toBe('10:00');

      const metrics = await adapter.getMetrics({
        role: 'OWNER',
        staffId: 'wellington-id',
      });
      expect(metrics.totalAppointments).toBe(1);
      expect(metrics.totalRevenueInCents).toBe(4500);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('mapeia agendamentos da Barbearia Estação para o modelo de Agenda', async () => {
    const originalFetch = global.fetch;

    global.fetch = async () =>
      new Response(
        JSON.stringify({
          bookings: [
            {
              id: 'estacao-booking-1',
              barbershopId: 'estacao-barbershop-id',
              barbermanId: 'alvaro-id',
              customer: {
                id: 'rodrigo-id',
                name: 'Rodrigo Ferreira',
                phoneNumber: '19922000001',
              },
              services: [
                {
                  id: 'corte-social-id',
                  title: 'Corte social',
                  priceInCents: 5000,
                  durationInMinutes: 35,
                },
              ],
              date: '2026-09-28',
              startTime: '10:30',
              endTime: '11:05',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );

    try {
      const adapter = new AgendaHttpAdapter();
      const agendaDay = await adapter.getAgendaDay({
        scope: { role: 'OWNER', staffId: 'alvaro-id' },
        date: '2026-09-28',
      });

      expect(agendaDay.date).toBe('2026-09-28');
      expect(agendaDay.entries).toHaveLength(1);
      const entry = agendaDay.entries[0];
      expect(entry.type).toBe('APPOINTMENT');
      if (entry.type === 'APPOINTMENT') {
        expect(entry.startTime).toBe('10:30');
        expect(entry.endTime).toBe('11:05');
        expect(entry.customerName).toBe('Rodrigo Ferreira');
        expect(entry.serviceTitle).toBe('Corte social');
        expect(entry.servicePriceInCents).toBe(5000);
      }
      expect(agendaDay.summary.bookedSlots).toBe(1);
      expect(agendaDay.summary.nextAppointment?.customerName).toBe('Rodrigo Ferreira');
      expect(agendaDay.summary.nextAppointment?.serviceTitle).toBe('Corte social');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
