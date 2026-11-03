import { describe, it, expect } from 'vitest';
import { normalizeCep, formatCep, isValidCep } from './cep';

describe('CEP utilities', () => {
  describe('normalizeCep', () => {
    it('preserva zeros iniciais em CEPs de capitais como São Paulo', () => {
      expect(normalizeCep('01001-000')).toBe('01001000');
      expect(normalizeCep('04538133')).toBe('04538133');
    });

    it('remove caracteres não numéricos e limita a 8 dígitos', () => {
      expect(normalizeCep('CEP: 13.083-970 (extra)')).toBe('13083970');
    });

    it('trata valores nulos, vazios ou indefinidos', () => {
      expect(normalizeCep('')).toBe('');
      expect(normalizeCep(null)).toBe('');
      expect(normalizeCep(undefined)).toBe('');
    });
  });

  describe('formatCep', () => {
    it('aplica a máscara 00000-000 em 8 dígitos com zero à esquerda', () => {
      expect(formatCep('01001000')).toBe('01001-000');
      expect(formatCep('70040010')).toBe('70040-010');
    });

    it('retorna dígitos parciais sem quebrar quando incompleto', () => {
      expect(formatCep('010')).toBe('010');
      expect(formatCep('01001')).toBe('01001');
      expect(formatCep('010012')).toBe('01001-2');
    });
  });

  describe('isValidCep', () => {
    it('retorna true para strings de exatamente 8 dígitos', () => {
      expect(isValidCep('01001000')).toBe(true);
      expect(isValidCep('01001-000')).toBe(true);
    });

    it('retorna false para CEPs incompletos ou vazios', () => {
      expect(isValidCep('')).toBe(false);
      expect(isValidCep('1234567')).toBe(false);
      expect(isValidCep('123456789')).toBe(true); // normalizado fatia até 8
      expect(isValidCep(null)).toBe(false);
    });
  });
});
