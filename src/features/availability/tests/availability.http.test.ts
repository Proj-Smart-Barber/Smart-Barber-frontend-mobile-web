import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, httpClient } from '@/shared/api';
import { AvailabilityHttpAdapter } from '../api/availability.http';
import { saveBarberSchedule } from '../model/save-barber-schedule';

const SHOP_ID = '0f470c91-15b9-4ac4-9d28-9e486ecfb732';

describe('AvailabilityHttpAdapter — contrato real feat/availability-engine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('busca metadados reais da barbearia e usa timezone retornado pela API', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
      barbershop: {
        id: SHOP_ID,
        name: 'Barbearia do Carlos',
        slug: 'barbearia-do-carlos',
        timezone: 'America/Sao_Paulo',
      },
    });

    const adapter = new AvailabilityHttpAdapter();
    const result = await adapter.getBarbershop(SHOP_ID);

    expect(getSpy).toHaveBeenCalledWith(`/api/barbershops/${SHOP_ID}`);
    expect(result).toEqual({
      id: SHOP_ID,
      name: 'Barbearia do Carlos',
      timezone: 'America/Sao_Paulo',
    });
  });

  it('normaliza dayOfWeek do backend e mantém apenas a jornada geral sem barbermanId', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      schedules: [
        {
          id: 'schedule-1',
          barbershopId: SHOP_ID,
          barbermanId: null,
          dayOfWeek: 'monday',
          openTime: '09:00',
          closeTime: '18:00',
        },
        {
          id: 'schedule-2',
          barbershopId: SHOP_ID,
          barbermanId: 'barber-1',
          dayOfWeek: 'TUESDAY',
          openTime: '10:00',
          closeTime: '19:00',
        },
      ],
    });

    const adapter = new AvailabilityHttpAdapter();
    const result = await adapter.getWeeklySchedule(SHOP_ID);

    expect(result).toHaveLength(1);
    expect(result[0]?.weekday).toBe('MONDAY');
    expect(result[0]?.barbermanId).toBeNull();
  });

  it('envia a jornada em batch sem createdBy e recarrega o escopo persistido', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
      schedules: [
        {
          id: 'schedule-1',
          barbershopId: SHOP_ID,
          barbermanId: null,
          dayOfWeek: 'MONDAY',
          openTime: '08:00',
          closeTime: '12:00',
        },
      ],
    });
    const putSpy = vi.spyOn(httpClient, 'put').mockResolvedValue({
      message: 'Jornada atualizada com sucesso.',
    });

    const adapter = new AvailabilityHttpAdapter();
    const result = await adapter.saveWeeklySchedule(SHOP_ID, [
      {
        weekday: 'MONDAY',
        barbermanId: null,
        range: { start: '08:00', end: '12:00' },
      },
    ]);

    expect(putSpy).toHaveBeenCalledWith(
      `/api/barbershops/${SHOP_ID}/schedules`,
      {
        schedules: [
          {
            dayOfWeek: 'MONDAY',
            openTime: '08:00',
            closeTime: '12:00',
          },
        ],
      },
      { params: undefined },
    );
    expect(getSpy).toHaveBeenCalledWith(
      `/api/barbershops/${SHOP_ID}/schedules`,
      { params: undefined },
    );
    expect(result[0]?.id).toBe('schedule-1');
  });

  it('usa barbermanId na query para substituir uma jornada profissional, inclusive com array vazio', async () => {
    const putSpy = vi.spyOn(httpClient, 'put').mockResolvedValue({
      message: 'Jornada atualizada com sucesso.',
    });
    vi.spyOn(httpClient, 'get').mockResolvedValue({ schedules: [] });

    const adapter = new AvailabilityHttpAdapter();
    const result = await adapter.saveWeeklySchedule(SHOP_ID, [], 'barber-1');

    expect(putSpy).toHaveBeenCalledWith(
      `/api/barbershops/${SHOP_ID}/schedules`,
      { schedules: [] },
      { params: { barbermanId: 'barber-1' } },
    );
    expect(result).toEqual([]);
  });

  it('traduz openTime/closeTime para startTime/endTime ao criar exceção', async () => {
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
      `/api/barbershops/${SHOP_ID}/schedule-exceptions`,
      {
        date: '2026-12-25',
        barbermanId: null,
        startTime: '10:00',
        endTime: '14:00',
        reason: 'Horário especial',
      },
    );
    expect(created.id).toBe('exception-1');
  });

  it('usa PATCH real e recarrega a exceção persistida pelo backend', async () => {
    const patchSpy = vi.spyOn(httpClient, 'patch').mockResolvedValue(undefined);
    vi.spyOn(httpClient, 'get').mockResolvedValue({
      exceptions: [
        {
          id: 'exception-1',
          barbershopId: SHOP_ID,
          barbermanId: null,
          date: '2026-12-25T00:00:00.000Z',
          startTime: '11:00',
          endTime: '15:00',
          reason: 'Atualizado',
        },
      ],
    });

    const adapter = new AvailabilityHttpAdapter();
    const updated = await adapter.updateException(SHOP_ID, 'exception-1', {
      openTime: '11:00',
      closeTime: '15:00',
      reason: 'Atualizado',
    });

    expect(patchSpy).toHaveBeenCalledWith(
      `/api/barbershops/${SHOP_ID}/schedule-exceptions/exception-1`,
      {
        startTime: '11:00',
        endTime: '15:00',
        reason: 'Atualizado',
      },
    );
    expect(updated.date).toBe('2026-12-25');
    expect(updated.openTime).toBe('11:00');
  });

  it('envia serviceIds no formato aceito pelo controller de availability', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({
      slots: [
        {
          start: '2026-09-13T09:00:00-03:00',
          end: '2026-09-13T10:00:00-03:00',
        },
      ],
    });

    const adapter = new AvailabilityHttpAdapter();
    const slots = await adapter.getCalculatedAvailability(SHOP_ID, {
      serviceIds: ['service-1', 'service-2'],
      date: '2026-09-13',
    });

    expect(getSpy).toHaveBeenCalledWith(
      `/api/barbershops/${SHOP_ID}/availability`,
      {
        params: {
          date: '2026-09-13',
          serviceIds: 'service-1,service-2',
          barbermanId: undefined,
        },
      },
    );
    expect(slots).toHaveLength(1);
  });
});


describe('recuperação de gravação no adapter HTTP', () => {
  afterEach(() => vi.restoreAllMocks());
  it.each([500, 0])('PUT 200 + GET %s mantém confirmação e não repete escrita', async status => {
    const put = vi.spyOn(httpClient, 'put').mockResolvedValue({ message: 'ok' });
    const get = vi.spyOn(httpClient, 'get').mockRejectedValue(new ApiError('Falha', status, null, status === 0));
    const result = await saveBarberSchedule(new AvailabilityHttpAdapter(), SHOP_ID, 'barber', []);
    expect(result.kind).toBe('unconfirmed-view');
    expect(result.message).toContain('Jornada salva');
    expect(put).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('PUT rejeitado não consulta nem informa sucesso', async () => {
    vi.spyOn(httpClient, 'put').mockRejectedValue(new ApiError('Conflito', 409, {
      error: 'Reserva incompatível', code: 'SCHEDULE_BOOKING_CONFLICT', conflicts: [],
    }));
    const get = vi.spyOn(httpClient, 'get');
    const result = await saveBarberSchedule(new AvailabilityHttpAdapter(), SHOP_ID, 'barber', []);
    expect(result.kind).toBe('rejected');
    if (result.kind === 'rejected') expect(result.error.code).toBe('SCHEDULE_BOOKING_CONFLICT');
    expect(get).not.toHaveBeenCalled();
  });
  it('PUT incerto reconcilia por GET sem repetir escrita', async () => {
    const put = vi.spyOn(httpClient, 'put').mockRejectedValue(new ApiError('Timeout', 0, null, true));
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({ schedules: [] });
    const result = await saveBarberSchedule(new AvailabilityHttpAdapter(), SHOP_ID, 'barber', []);
    expect(result.kind).toBe('saved');
    expect(put).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it('PUT incerto e GET indisponível continuam pendentes', async () => {
    const put = vi.spyOn(httpClient, 'put').mockRejectedValue(new ApiError('Timeout', 0, null, true));
    vi.spyOn(httpClient, 'get').mockRejectedValue(new ApiError('Falha', 500));
    expect((await saveBarberSchedule(new AvailabilityHttpAdapter(), SHOP_ID, 'barber', [])).kind).toBe('unknown');
    expect(put).toHaveBeenCalledTimes(1);
  });
});
