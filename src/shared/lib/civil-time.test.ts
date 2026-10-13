import { describe, it, expect } from 'vitest';
import {
  toISODate,
  parseISODate,
  addDays,
  diffInDays,
  isWithinNavigationLimit,
  addMonths,
  formatMonthLabel,
  getCalendarWeekdaysShort,
  getCalendarWeeks,
  formatDateLabel,
  formatDateLabelShort,
  minutesBetween,
  getCivilDateInTimezone,
  getCivilTimeInTimezone,
} from './civil-time';

describe('civil-time — utilitários puros de tempo civil', () => {
  it('converte Date e manipula dias e meses de forma pura', () => {
    const d = new Date(2026, 8, 15); // 15 de setembro de 2026
    const iso = toISODate(d);
    expect(iso).toBe('2026-09-15');

    expect(addDays('2026-09-15', 5)).toBe('2026-09-20');
    expect(addDays('2026-09-15', -20)).toBe('2026-08-26');
    expect(diffInDays('2026-09-15', '2026-09-20')).toBe(5);
    expect(isWithinNavigationLimit('2026-09-20', '2026-09-15', 10)).toBe(true);
    expect(isWithinNavigationLimit('2026-10-01', '2026-09-15', 10)).toBe(false);

    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(formatMonthLabel('2026-09-15')).toContain('Setembro de 2026');
  });

  it('calcula matriz de semanas e rótulos de dias da semana', () => {
    const weekdays = getCalendarWeekdaysShort();
    expect(weekdays.length).toBe(7);
    expect(weekdays[0].toLowerCase()).toContain('dom');

    const weeks = getCalendarWeeks('2026-09-01');
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks[0].length).toBe(7);
  });

  it('formata rótulos de data em pt-BR', () => {
    const label = formatDateLabel('2026-09-07');
    expect(label.toLowerCase()).toContain('setembro');
    expect(label).toContain('7');

    const short = formatDateLabelShort('2026-09-07');
    expect(short).toContain('7');
    expect(short.toLowerCase()).toContain('set');
  });

  it('calcula diferença de minutos entre horários HH:mm', () => {
    expect(minutesBetween('09:00', '10:30')).toBe(90);
    expect(minutesBetween('14:15', '14:45')).toBe(30);
    expect(minutesBetween('11:00', '10:00')).toBe(-60);
  });

  it('converte timestamp UTC para data e hora civil no fuso da unidade (São Paulo UTC-3)', () => {
    // 2026-10-14 01:30:00 UTC = 2026-10-13 22:30:00 em São Paulo (UTC-3)
    const timestampUtc = Date.UTC(2026, 9, 14, 1, 30, 0);

    const spDate = getCivilDateInTimezone(timestampUtc, 'America/Sao_Paulo');
    expect(spDate).toBe('2026-10-13');

    const spTime = getCivilTimeInTimezone(timestampUtc, 'America/Sao_Paulo');
    expect(spTime).toBe('22:30');

    // Em UTC o dia seria 2026-10-14
    const utcDate = getCivilDateInTimezone(timestampUtc, 'UTC');
    expect(utcDate).toBe('2026-10-14');
  });
});
