import { describe, it, expect } from 'vitest';
import {
  mapBarbershopDto,
  mapWeeklyScheduleEntryDto,
  mapAvailabilityExceptionDto,
  mapWeeklyScheduleList,
} from '../api/availability.mapper';

describe('mapBarbershopDto', () => {
  it('mapeia campos válidos', () => {
    const result = mapBarbershopDto({ id: '1', name: 'Barbearia', timezone: 'America/Sao_Paulo' });
    expect(result).toEqual({ id: '1', name: 'Barbearia', timezone: 'America/Sao_Paulo' });
  });

  it('retorna null quando campos obrigatórios faltam', () => {
    expect(mapBarbershopDto({ id: '', name: 'X', timezone: 'Y' })).toBeNull();
  });
});

describe('mapWeeklyScheduleEntryDto', () => {
  it('mapeia entrada válida', () => {
    const result = mapWeeklyScheduleEntryDto({
      id: 'sch-1', day_of_week: 'MONDAY', barberman_id: null,
      open_time: '08:00', close_time: '18:00',
    });
    expect(result?.weekday).toBe('MONDAY');
    expect(result?.range).toEqual({ start: '08:00', end: '18:00' });
    expect(result?.barbermanId).toBeNull();
  });

  it('descarta entrada com horário inválido', () => {
    const result = mapWeeklyScheduleEntryDto({
      id: 'sch-2', day_of_week: 'FRIDAY', barberman_id: null,
      open_time: '25:00', close_time: '18:00',
    });
    expect(result).toBeNull();
  });

  it('descarta entrada com weekday desconhecido', () => {
    const result = mapWeeklyScheduleEntryDto({
      id: 'sch-3', day_of_week: 'SOMEDAY' as any, barberman_id: null,
      open_time: '08:00', close_time: '18:00',
    });
    expect(result).toBeNull();
  });
});

describe('mapWeeklyScheduleList', () => {
  it('filtra entradas inválidas defensivamente', () => {
    const result = mapWeeklyScheduleList([
      { id: 'ok', day_of_week: 'MONDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
      { id: 'bad', day_of_week: 'INVALID' as any, barberman_id: null, open_time: '08:00', close_time: '12:00' },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.weekday).toBe('MONDAY');
  });
});

describe('mapAvailabilityExceptionDto', () => {
  it('mapeia exceção de dia fechado', () => {
    const result = mapAvailabilityExceptionDto({
      id: 'exc-1', date: '2026-12-25', barberman_id: null,
      open_time: null, close_time: null, reason: 'Natal',
    });
    expect(result?.openTime).toBeNull();
    expect(result?.reason).toBe('Natal');
  });
});
