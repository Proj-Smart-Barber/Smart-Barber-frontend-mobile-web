import { describe, it, expect } from 'vitest';
import { formatReviewDate } from '../lib/booking-review-formatters';

describe('formatReviewDate', () => {
  it('retorna "Data a confirmar" para entradas nulas, indefinidas ou vazias', () => {
    expect(formatReviewDate(null)).toBe('Data a confirmar');
    expect(formatReviewDate(undefined)).toBe('Data a confirmar');
    expect(formatReviewDate('')).toBe('Data a confirmar');
    expect(formatReviewDate('   ')).toBe('Data a confirmar');
    expect(formatReviewDate('invalid-date')).toBe('Data a confirmar');
    expect(formatReviewDate(new Date('invalid'))).toBe('Data a confirmar');
  });

  it('formata corretamente uma string YYYY-MM-DD em português com ano claro', () => {
    // 2026-11-11 é uma quarta-feira
    const result = formatReviewDate('2026-11-11');
    expect(result).toMatch(/Qua[.,]/i);
    expect(result).toContain('11');
    expect(result).toContain('novembro');
    expect(result).toContain('2026');
  });

  it('trata datas próximas da virada de mês e ano sem mudar o dia civil', () => {
    const endOfYear = formatReviewDate('2026-12-31');
    expect(endOfYear).toContain('31');
    expect(endOfYear).toContain('dezembro');
    expect(endOfYear).toContain('2026');

    const startOfYear = formatReviewDate('2027-01-01');
    expect(startOfYear).toContain('1');
    expect(startOfYear).toContain('janeiro');
    expect(startOfYear).toContain('2027');
  });

  it('aceita instâncias de Date válidas', () => {
    const d = new Date(2026, 10, 15, 10, 0, 0); // 15 de novembro de 2026
    const formatted = formatReviewDate(d);
    expect(formatted).toContain('15');
    expect(formatted).toContain('novembro');
    expect(formatted).toContain('2026');
  });
});
