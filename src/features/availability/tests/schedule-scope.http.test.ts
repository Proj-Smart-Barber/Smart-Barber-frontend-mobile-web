import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, httpClient } from '@/shared/api';
import { AvailabilityHttpAdapter } from '../api/availability.http';

const SHOP = '0f470c91-15b9-4ac4-9d28-9e486ecfb732';
const USER = 'a3c1f8ee-0000-4000-8000-000000000001';
const item = (over: Record<string, unknown> = {}) => ({
  id: 's1', barbershopId: SHOP, barbermanId: USER, dayOfWeek: 'monday', openTime: '09:00', closeTime: '12:00', ...over,
});
const document = (over: Record<string, unknown> = {}) => ({
  schedules: [item()], effectiveSchedules: [item()], state: 'CUSTOM', version: 7, needsReview: false,
  serverTime: '2026-10-19T12:00:00.000Z', ...over,
});

afterEach(() => vi.restoreAllMocks());

describe('AvailabilityHttpAdapter — documento de escopo (contrato final da jornada)', () => {
  it('GET lê schedules, effectiveSchedules, state, version, needsReview e serverTime do escopo do profissional', async () => {
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue(document());
    const result = await new AvailabilityHttpAdapter().getScheduleScope(SHOP, USER);
    expect(get).toHaveBeenCalledWith(`/api/barbershops/${SHOP}/schedules`, { params: { barbermanId: USER } });
    expect(result).toMatchObject({ barbermanId: USER, state: 'CUSTOM', version: 7, needsReview: false,
      serverTime: '2026-10-19T12:00:00.000Z' });
    expect(result.schedules[0]).toMatchObject({ weekday: 'MONDAY', range: { start: '09:00', end: '12:00' } });
    expect(result.effectiveSchedules).toHaveLength(1);
  });

  it('distingue INHERIT, CUSTOM e CLOSED mesmo quando schedules vem vazio', async () => {
    const adapter = new AvailabilityHttpAdapter();
    for (const state of ['INHERIT', 'CLOSED']) {
      vi.spyOn(httpClient, 'get').mockResolvedValueOnce(document({ state, schedules: [], effectiveSchedules: state === 'CLOSED' ? [] : [item()] }));
      const result = await adapter.getScheduleScope(SHOP, USER);
      expect(result.state).toBe(state);
      expect(result.schedules).toEqual([]);
    }
  });

  it('legado que exige revisão chega fechado, sem abrir horários, com needsReview', async () => {
    vi.spyOn(httpClient, 'get').mockResolvedValue(document({ state: 'CLOSED', schedules: [], effectiveSchedules: [], version: 1, needsReview: true }));
    const result = await new AvailabilityHttpAdapter().getScheduleScope(SHOP, USER);
    expect(result).toMatchObject({ state: 'CLOSED', needsReview: true, effectiveSchedules: [] });
  });

  it.each([
    ['sem state', { state: undefined }], ['state desconhecido', { state: 'OPEN' }],
    ['sem version', { version: undefined }], ['version fracionária', { version: 1.5 }],
    ['item malformado', { schedules: [item({ openTime: '9h' })] }],
  ])('falha fechado em resposta incompleta: %s', async (_name, over) => {
    vi.spyOn(httpClient, 'get').mockResolvedValue(document(over));
    await expect(new AvailabilityHttpAdapter().getScheduleScope(SHOP, USER)).rejects.toMatchObject({ status: 502 });
  });

  it('PUT envia state, expectedVersion, Idempotency-Key e o escopo na query, sem identidade no corpo', async () => {
    const put = vi.spyOn(httpClient, 'put').mockResolvedValue({ message: 'ok', ...document({ version: 8 }) });
    const result = await new AvailabilityHttpAdapter().saveScheduleScope(SHOP, {
      barbermanId: USER, state: 'CUSTOM', expectedVersion: 7, requestId: '01934f5e-0000-7000-8000-000000000001',
      entries: [{ weekday: 'MONDAY', barbermanId: USER, range: { start: '09:00', end: '12:00' } }],
    });
    expect(put).toHaveBeenCalledWith(`/api/barbershops/${SHOP}/schedules`,
      { schedules: [{ dayOfWeek: 'MONDAY', openTime: '09:00', closeTime: '12:00' }], state: 'CUSTOM', expectedVersion: 7 },
      { params: { barbermanId: USER }, headers: { 'Idempotency-Key': '01934f5e-0000-7000-8000-000000000001' } });
    expect(JSON.stringify(put.mock.calls[0][1])).not.toContain(USER);
    expect(result.version).toBe(8);
  });

  it('CLOSED e INHERIT enviam períodos vazios', async () => {
    const put = vi.spyOn(httpClient, 'put').mockResolvedValue({ message: 'ok', ...document({ state: 'INHERIT', schedules: [] }) });
    await new AvailabilityHttpAdapter().saveScheduleScope(SHOP, { barbermanId: USER, state: 'INHERIT', entries: [], expectedVersion: 1, requestId: 'r' });
    expect(put.mock.calls[0][1]).toMatchObject({ schedules: [], state: 'INHERIT', expectedVersion: 1 });
  });

  it('recusa entradas de outro escopo antes de chamar a rede', async () => {
    const put = vi.spyOn(httpClient, 'put');
    await expect(new AvailabilityHttpAdapter().saveScheduleScope(SHOP, {
      barbermanId: USER, state: 'CUSTOM', expectedVersion: 1, requestId: 'r',
      entries: [{ weekday: 'MONDAY', barbermanId: 'colega', range: { start: '09:00', end: '12:00' } }],
    })).rejects.toMatchObject({ status: 400, data: { code: 'SCHEDULE_SCOPE_MISMATCH' } });
    expect(put).not.toHaveBeenCalled();
  });

  it('2xx com corpo ilegível surge como erro 502 (incerto), nunca como sucesso', async () => {
    vi.spyOn(httpClient, 'put').mockResolvedValue({ message: 'ok' });
    await expect(new AvailabilityHttpAdapter().saveScheduleScope(SHOP, {
      barbermanId: USER, state: 'CLOSED', entries: [], expectedVersion: 1, requestId: 'r',
    })).rejects.toBeInstanceOf(ApiError);
  });
});
