import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api';
import { AvailabilityHttpAdapter } from '../api/availability.http';

const SHOP_ID = 'shop-1';

describe('AvailabilityHttpAdapter — contrato feat/availability-engine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envia uma requisição PUT por intervalo usando camelCase do backend', async () => {
    const putSpy = vi
      .spyOn(httpClient, 'put')
      .mockResolvedValueOnce({ scheduleId: 'schedule-1', message: 'ok' })
      .mockResolvedValueOnce({ scheduleId: 'schedule-2', message: 'ok' });

    const adapter = new AvailabilityHttpAdapter();
    const result = await adapter.saveWeeklySchedule(SHOP_ID, [
      {
        weekday: 'MONDAY',
        barbermanId: null,
        range: { start: '08:00', end: '12:00' },
      },
      {
        weekday: 'MONDAY',
        barbermanId: null,
        range: { start: '13:00', end: '18:00' },
      },
    ]);

    expect(putSpy).toHaveBeenCalledTimes(2);
    expect(putSpy).toHaveBeenNthCalledWith(
      1,
      '/api/barbershops/shop-1/schedules',
      {
        dayOfWeek: 'MONDAY',
        openTime: '08:00',
        closeTime: '12:00',
        barbermanId: null,
      },
    );
    expect(result.map((entry) => entry.id)).toEqual(['schedule-1', 'schedule-2']);
  });

  it('traduz openTime/closeTime do domínio para startTime/endTime da exceção', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({
      exceptionId: 'exception-1',
      message: 'ok',
    });

    const adapter = new AvailabilityHttpAdapter();
    const created = await adapter.createException(SHOP_ID, {
      date: '2026-12-25',
      barbermanId: null,
      openTime: '10:00',
      closeTime: '14:00',
      reason: 'Horário especial',
    });

    expect(postSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-1/schedule-exceptions',
      {
        date: '2026-12-25',
        barbermanId: null,
        startTime: '10:00',
        endTime: '14:00',
        reason: 'Horário especial',
      },
    );
    expect(created.id).toBe('exception-1');
    expect(created.openTime).toBe('10:00');
  });

  it('envia serviceIds no formato aceito pelo controller de availability', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
      slots: [
        {
          start: '2026-09-11T09:00:00-03:00',
          end: '2026-09-11T10:00:00-03:00',
        },
      ],
    });

    const adapter = new AvailabilityHttpAdapter();
    const slots = await adapter.getCalculatedAvailability(SHOP_ID, {
      serviceIds: ['service-1', 'service-2'],
      date: '2026-09-11',
    });

    expect(getSpy).toHaveBeenCalledWith(
      '/api/barbershops/shop-1/availability',
      {
        params: {
          date: '2026-09-11',
          serviceIds: 'service-1,service-2',
          barbermanId: undefined,
        },
      },
    );
    expect(slots).toHaveLength(1);
  });

  it('preserva jornada salva no espelho quando GET do backend retorna lista vazia', async () => {
    vi.spyOn(httpClient, 'put').mockResolvedValue({ scheduleId: 'schedule-1', message: 'ok' });
    vi.spyOn(httpClient, 'get').mockResolvedValue({ schedules: [] });

    const adapter = new AvailabilityHttpAdapter();
    await adapter.saveWeeklySchedule(SHOP_ID, [
      {
        weekday: 'FRIDAY',
        barbermanId: null,
        range: { start: '09:00', end: '18:00' },
      },
    ]);

    const result = await adapter.getWeeklySchedule(SHOP_ID);
    expect(result).toHaveLength(1);
    expect(result[0]?.weekday).toBe('FRIDAY');
  });
});
