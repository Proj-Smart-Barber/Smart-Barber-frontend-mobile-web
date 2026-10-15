import { describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api';
import { AvailabilityHttpAdapter } from '../api/availability.http';

const SHOP_ID = '0f470c91-15b9-4ac4-9d28-9e486ecfb732';
const BARBER_A_ID = 'barber-001';
const BARBER_B_ID = 'barber-002';

describe('Availability Scope Isolation — Jornada Individual vs Geral', () => {
  it('garante que edição da jornada do barbeiro A não afeta a jornada geral nem o barbeiro B', async () => {
    const putSpy = vi.spyOn(httpClient, 'put').mockResolvedValue({
      message: 'Jornada atualizada com sucesso.',
    });

    const getSpy = vi.spyOn(httpClient, 'get').mockImplementation(async (url: string, config?: any) => {
      const barberIdParam = config?.params?.barbermanId;

      if (url.includes('/schedules')) {
        return {
          schedules: [
            // Jornada geral
            {
              id: 'general-mon',
              barbershopId: SHOP_ID,
              barbermanId: null,
              dayOfWeek: 'MONDAY',
              openTime: '08:00',
              closeTime: '18:00',
            },
            // Jornada Barbeiro A
            {
              id: 'barber-a-mon',
              barbershopId: SHOP_ID,
              barbermanId: BARBER_A_ID,
              dayOfWeek: 'MONDAY',
              openTime: '10:00',
              closeTime: '16:00',
            },
            // Jornada Barbeiro B
            {
              id: 'barber-b-mon',
              barbershopId: SHOP_ID,
              barbermanId: BARBER_B_ID,
              dayOfWeek: 'MONDAY',
              openTime: '12:00',
              closeTime: '20:00',
            },
          ],
        };
      }
      return {};
    });

    const adapter = new AvailabilityHttpAdapter();

    // 1. Salvar horários do Barbeiro A
    const savedA = await adapter.saveWeeklySchedule(
      SHOP_ID,
      [
        {
          weekday: 'MONDAY',
          barbermanId: BARBER_A_ID,
          range: { start: '09:00', end: '15:00' },
        },
      ],
      BARBER_A_ID,
    );

    // PUT deve ter sido enviado com params { barbermanId: BARBER_A_ID }
    expect(putSpy).toHaveBeenCalledWith(
      `/api/barbershops/${SHOP_ID}/schedules`,
      {
        schedules: [
          {
            dayOfWeek: 'MONDAY',
            openTime: '09:00',
            closeTime: '15:00',
          },
        ],
      },
      {
        params: { barbermanId: BARBER_A_ID },
      },
    );

    // 2. Consulta de jornada geral só deve retornar registros com barbermanId: null
    const generalSchedule = await adapter.getWeeklySchedule(SHOP_ID);
    expect(generalSchedule).toHaveLength(1);
    expect(generalSchedule[0].barbermanId).toBeNull();
    expect(generalSchedule[0].range.start).toBe('08:00');
    expect(generalSchedule[0].range.end).toBe('18:00');

    // 3. Consulta do Barbeiro B só deve retornar registros do Barbeiro B
    const barberBSchedule = await adapter.getWeeklySchedule(SHOP_ID, BARBER_B_ID);
    expect(barberBSchedule).toHaveLength(1);
    expect(barberBSchedule[0].barbermanId).toBe(BARBER_B_ID);
    expect(barberBSchedule[0].range.start).toBe('12:00');
    expect(barberBSchedule[0].range.end).toBe('20:00');

    // 4. Consulta do Barbeiro A só retorna registros do Barbeiro A
    const barberASchedule = await adapter.getWeeklySchedule(SHOP_ID, BARBER_A_ID);
    expect(barberASchedule).toHaveLength(1);
    expect(barberASchedule[0].barbermanId).toBe(BARBER_A_ID);

    putSpy.mockRestore();
    getSpy.mockRestore();
  });

  it('isola exceções criadas para barbeiro específico sem associar à unidade geral', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({
      exceptionId: 'exc-barber-a',
    });

    const adapter = new AvailabilityHttpAdapter();
    const created = await adapter.createException(SHOP_ID, {
      date: '2026-11-20',
      barbermanId: BARBER_A_ID,
      openTime: '10:00',
      closeTime: '12:00',
      reason: 'Treinamento individual',
    });

    expect(postSpy).toHaveBeenCalledWith(
      `/api/barbershops/${SHOP_ID}/schedule-exceptions`,
      {
        date: '2026-11-20',
        barbermanId: BARBER_A_ID,
        startTime: '10:00',
        endTime: '12:00',
        reason: 'Treinamento individual',
      },
    );
    expect(created.barbermanId).toBe(BARBER_A_ID);

    postSpy.mockRestore();
  });
});
