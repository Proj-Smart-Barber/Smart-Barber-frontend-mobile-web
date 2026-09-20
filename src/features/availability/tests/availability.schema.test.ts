import { describe, it, expect } from 'vitest';
import { timeRangeSchema, scheduleDaySchema, availabilityExceptionSchema } from '../model/availability.schema';

describe('timeRangeSchema', () => {
  it('aceita intervalo válido', () => {
    expect(timeRangeSchema.safeParse({ start: '08:00', end: '18:00' }).success).toBe(true);
  });

  it('rejeita horário final antes do inicial (Critério 4)', () => {
    const result = timeRangeSchema.safeParse({ start: '18:00', end: '08:00' });
    expect(result.success).toBe(false);
  });

  it('rejeita horário com formato inválido', () => {
    expect(timeRangeSchema.safeParse({ start: '8:0', end: '18:00' }).success).toBe(false);
  });
});

describe('scheduleDaySchema', () => {
  it('aceita dois ranges sem sobreposição (pausa de almoço)', () => {
    const result = scheduleDaySchema.safeParse([
      { weekday: 'MONDAY', barbermanId: null, range: { start: '08:00', end: '12:00' } },
      { weekday: 'MONDAY', barbermanId: null, range: { start: '13:00', end: '18:00' } },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejeita ranges com sobreposição (Critério 4)', () => {
    const result = scheduleDaySchema.safeParse([
      { weekday: 'MONDAY', barbermanId: null, range: { start: '08:00', end: '12:00' } },
      { weekday: 'MONDAY', barbermanId: null, range: { start: '11:00', end: '15:00' } },
    ]);
    expect(result.success).toBe(false);
  });
});

describe('availabilityExceptionSchema', () => {
  it('aceita dia fechado (openTime/closeTime nulos)', () => {
    expect(
      availabilityExceptionSchema.safeParse({
        date: '2026-12-25', barbermanId: null,
        openTime: null, closeTime: null, reason: 'Natal',
      }).success
    ).toBe(true);
  });

  it('rejeita quando apenas um dos horários é nulo', () => {
    const result = availabilityExceptionSchema.safeParse({
      date: '2026-12-25', barbermanId: null,
      openTime: '08:00', closeTime: null, reason: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita quando closeTime é antes do openTime', () => {
    const result = availabilityExceptionSchema.safeParse({
      date: '2026-12-25', barbermanId: null,
      openTime: '18:00', closeTime: '08:00', reason: null,
    });
    expect(result.success).toBe(false);
  });
});
