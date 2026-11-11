import { describe, expect, it } from 'vitest';
import { civilDate, parseMoney, shiftMonth } from '../model/finance.helpers';

describe('Entradas financeiras', () => {
  it.each([
    ['1.234,56', 123456],
    ['10,50', 1050],
    ['10.50', 1050],
    ['1.000', 100000],
    ['0', null],
    ['-10', null],
    ['1,234', null],
    ['1e3', null],
    ['', null],
    ['Infinity', null],
  ])('interpreta %s em centavos', (value, expected) => {
    expect(parseMoney(String(value))).toBe(expected);
  });
  it('valida datas civis e ano bissexto', () => {
    expect(civilDate('29/02/2028')).toBe('2028-02-29');
    expect(civilDate('29/02/2027')).toBeNull();
    expect(civilDate('31/11/2026')).toBeNull();
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});
