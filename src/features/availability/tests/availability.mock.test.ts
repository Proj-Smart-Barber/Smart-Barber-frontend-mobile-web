import { describe, it, expect, beforeEach } from 'vitest';
import { AvailabilityMockAdapter, SEED_BARBERSHOP_ID } from '../api/availability.mock';

describe('AvailabilityMockAdapter', () => {
  let adapter: AvailabilityMockAdapter;

  beforeEach(() => {
    adapter = new AvailabilityMockAdapter(0); // sem latência nos testes
  });

  it('retorna a barbearia seed', async () => {
    const barbershop = await adapter.getBarbershop(SEED_BARBERSHOP_ID);
    expect(barbershop.timezone).toBe('America/Sao_Paulo');
  });

  it('retorna jornada inicial com pausa de almoço na segunda', async () => {
    const schedule = await adapter.getWeeklySchedule(SEED_BARBERSHOP_ID);
    const mondays = schedule.filter((e) => e.weekday === 'MONDAY');
    expect(mondays).toHaveLength(2);
    expect(mondays[0]!.range).toEqual({ start: '08:00', end: '12:00' });
    expect(mondays[1]!.range).toEqual({ start: '13:00', end: '18:00' });
  });

  it('domingo não tem entradas (fechado)', async () => {
    const schedule = await adapter.getWeeklySchedule(SEED_BARBERSHOP_ID);
    const sundays = schedule.filter((e) => e.weekday === 'SUNDAY');
    expect(sundays).toHaveLength(0);
  });

  it('salva nova jornada e invalida a anterior', async () => {
    await adapter.saveWeeklySchedule(SEED_BARBERSHOP_ID, [
      { weekday: 'MONDAY', barbermanId: null, range: { start: '09:00', end: '17:00' } },
    ]);
    const schedule = await adapter.getWeeklySchedule(SEED_BARBERSHOP_ID);
    const mondays = schedule.filter((e) => e.weekday === 'MONDAY');
    expect(mondays).toHaveLength(1);
    expect(mondays[0]!.range.start).toBe('09:00');
  });

  it('cria e remove exceção', async () => {
    await adapter.createException(SEED_BARBERSHOP_ID, {
      date: '2026-11-02', barbermanId: null,
      openTime: null, closeTime: null, reason: 'Finados',
    });
    const list = await adapter.listExceptions(SEED_BARBERSHOP_ID);
    expect(list.some((e) => e.date === '2026-11-02')).toBe(true);

    const toRemove = list.find((e) => e.date === '2026-11-02')!;
    await adapter.removeException(SEED_BARBERSHOP_ID, toRemove.id);

    const after = await adapter.listExceptions(SEED_BARBERSHOP_ID);
    expect(after.some((e) => e.date === '2026-11-02')).toBe(false);
  });
});
