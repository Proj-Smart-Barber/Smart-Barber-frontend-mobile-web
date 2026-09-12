import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  diffInDays,
  formatClockRange,
  formatCurrency,
  formatDateLabel,
  formatDateLabelShort,
  formatDurationMinutes,
  formatLastUpdated,
  formatMonthLabel,
  formatUtcDateQuery,
  getCalendarWeekdaysShort,
  getCalendarWeeks,
  isWithinNavigationLimit,
  minutesBetween,
  parseISODate,
  sortBookingsChronologically,
  timeToMinutes,
  toISODate,
} from '../model/agenda.helpers';

describe('Agenda Helpers — datas', () => {
  it('deve converter Date local para ISO e de volta', () => {
    const iso = toISODate(new Date(2026, 8, 7));
    expect(iso).toBe('2026-09-07');
    const parsed = parseISODate(iso);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(7);
  });

  it('deve navegar entre dias atravessando fronteiras de mês e ano', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('deve calcular diferença em dias e limite de navegação de ±90 dias', () => {
    expect(diffInDays('2026-09-07', '2026-06-09')).toBe(-90);
    expect(diffInDays('2026-09-07', '2026-12-06')).toBe(90);
    expect(isWithinNavigationLimit('2026-09-07', '2026-09-07', 90)).toBe(true);
    expect(isWithinNavigationLimit('2026-12-06', '2026-09-07', 90)).toBe(true);
    expect(isWithinNavigationLimit('2026-12-07', '2026-09-07', 90)).toBe(false);
    expect(isWithinNavigationLimit('2026-06-08', '2026-09-07', 90)).toBe(false);
  });

  it('deve formatar rótulo de data em pt-BR com inicial maiúscula', () => {
    expect(formatDateLabel('2026-09-07')).toBe('Segunda-feira, 7 de setembro');
  });

  it('deve formatar rótulo curto de data em pt-BR (compacto)', () => {
    expect(formatDateLabelShort('2026-09-07')).toBe('Seg, 7 de set');
    expect(formatDateLabelShort('2026-11-01')).toBe('Dom, 1 de nov');
  });

  it('deve navegar meses preservando o dia quando possível', () => {
    expect(addMonths('2026-09-07', 1)).toBe('2026-10-07');
    expect(addMonths('2026-09-07', -3)).toBe('2026-06-07');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 2)).toBe('2027-02-15');
  });

  it('deve formatar rótulo de mês', () => {
    expect(formatMonthLabel('2026-09-07')).toBe('Setembro de 2026');
  });
});

describe('Agenda Helpers — calendário', () => {
  it('deve expor rótulos de semana começando no domingo', () => {
    expect(getCalendarWeekdaysShort()).toEqual(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']);
  });

  it('deve montar a matriz de setembro de 2026 com espaços à esquerda', () => {
    const weeks = getCalendarWeeks('2026-09-07');
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
    expect(weeks[4]).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', null, null, null]);
  });

  it('deve montar a matriz de novembro de 2026 iniciando no domingo', () => {
    const weeks = getCalendarWeeks('2026-11-05');
    expect(weeks[0][0]).toBe('2026-11-01');
    expect(weeks[0]).not.toContain(null);
  });

  it('deve sempre produzir semanas completas de 7 células', () => {
    const weeks = getCalendarWeeks('2026-02-01');
    weeks.forEach((week) => expect(week).toHaveLength(7));
  });
});

describe('Agenda Helpers — horários e durações', () => {
  it('deve converter horários e calcular intervalos', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesBetween('09:00', '09:45')).toBe(45);
    expect(formatClockRange('09:00', '09:45')).toBe('09:00–09:45');
  });

  it('deve formatar durações em minutos e horas', () => {
    expect(formatDurationMinutes(15)).toBe('15 min');
    expect(formatDurationMinutes(45)).toBe('45 min');
    expect(formatDurationMinutes(60)).toBe('1 h');
    expect(formatDurationMinutes(75)).toBe('1 h 15 min');
  });

  it('deve formatar valores em centavos para BRL', () => {
    expect(formatCurrency(4000)).toBe('R$ 40,00');
    expect(formatCurrency(14280)).toBe('R$ 142,80');
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });
});

describe('Agenda Helpers — sincronização', () => {
  it('deve formatar a última atualização', () => {
    expect(formatLastUpdated(new Date(2026, 8, 7, 14, 32).getTime())).toBe('Atualizado às 14:32');
  });
});

describe('Agenda Helpers — data UTC da consulta', () => {
  it('deve manter strings "yyyy-MM-dd" inalteradas', () => {
    expect(formatUtcDateQuery('2026-09-07')).toBe('2026-09-07');
  });

  it('deve formatar Date em UTC, sem deslocar por fuso local', () => {
    // Instante 02:30Z pertence ao dia UTC 08, mesmo sendo 23:30 em UTC-3.
    expect(formatUtcDateQuery(new Date('2026-09-08T02:30:00.000Z'))).toBe('2026-09-08');
    // Instante 00:30Z pertence ao dia UTC 07.
    expect(formatUtcDateQuery(new Date('2026-09-07T00:30:00.000Z'))).toBe('2026-09-07');
  });

  it('deve rejeitar datas inválidas', () => {
    expect(() => formatUtcDateQuery('data-invalida')).toThrow();
  });
});

describe('Agenda Helpers — ordenação', () => {
  it('deve ordenar bookings cronologicamente de forma estável', () => {
    const bookings = [
      { id: '1', startTime: '11:00' },
      { id: '2', startTime: '09:30' },
      { id: '3', startTime: '11:00' },
      { id: '4', startTime: '10:15' },
    ];
    const sorted = sortBookingsChronologically(bookings);
    expect(sorted.map((booking) => booking.id)).toEqual(['2', '4', '1', '3']);
    // não muta o array original
    expect(bookings[0].id).toBe('1');
  });
});
