import { describe, expect, it } from 'vitest';
import {
  formatPrice,
  formatDuration,
  parsePriceToCents,
} from '../model/service.types';
import { serviceFormSchema } from '../model/service.schema';
import { maskCurrencyInput } from '../ui/input-masks';

describe('Service Presentation and Validation Helpers', () => {
  describe('formatPrice', () => {
    it('deve formatar centavos para BRL corretamente', () => {
      expect(formatPrice(4000)).toBe('R$\u00a040,00');
      expect(formatPrice(3550)).toBe('R$\u00a035,50');
      expect(formatPrice(0)).toBe('R$\u00a00,00');
    });

    it('deve proteger contra valores negativos ou NaN', () => {
      expect(formatPrice(-500)).toBe('R$\u00a00,00');
      expect(formatPrice(NaN)).toBe('R$\u00a00,00');
    });
  });

  describe('formatDuration', () => {
    it('deve formatar durações menores que 60 minutos', () => {
      expect(formatDuration(30)).toBe('30 min');
      expect(formatDuration(45)).toBe('45 min');
    });

    it('deve formatar durações exatas em horas', () => {
      expect(formatDuration(60)).toBe('1h');
      expect(formatDuration(120)).toBe('2h');
    });

    it('deve formatar durações compostas de horas e minutos', () => {
      expect(formatDuration(75)).toBe('1h 15m');
      expect(formatDuration(90)).toBe('1h 30m');
    });
  });

  describe('parsePriceToCents', () => {
    it('deve converter strings monetárias brasileiras para centavos inteiros', () => {
      expect(parsePriceToCents('40,00')).toBe(4000);
      expect(parsePriceToCents('45.50')).toBe(4550);
      expect(parsePriceToCents('120')).toBe(12000);
      expect(parsePriceToCents('R$ 35,00')).toBe(3500);
      expect(parsePriceToCents('1.234,56')).toBe(123456);
      expect(parsePriceToCents('R$ 1.234,56')).toBe(123456);
    });

    it('deve retornar 0 para valores inválidos, negativos, zerados ou com letras', () => {
      expect(parsePriceToCents('0')).toBe(0);
      expect(parsePriceToCents('0,00')).toBe(0);
      expect(parsePriceToCents('abc')).toBe(0);
      expect(parsePriceToCents('12abc')).toBe(0);
      expect(parsePriceToCents('40x')).toBe(0);
      expect(parsePriceToCents('-10')).toBe(0);
      expect(parsePriceToCents('1,,23')).toBe(0);
    });
  });

  describe('serviceFormSchema', () => {
    it('deve validar formulário de serviço com dados corretos', () => {
      const valid = {
        title: 'Corte Degradê',
        price: '45,00',
        durationInMinutes: 30,
        description: 'Corte moderno navalhado',
      };

      const result = serviceFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar título curto demais', () => {
      const invalid = {
        title: 'C',
        price: '45,00',
        durationInMinutes: 30,
      };

      const result = serviceFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('no mínimo 2 caracteres');
      }
    });

    it('deve rejeitar preço zerado ou negativo', () => {
      const invalid = {
        title: 'Corte Simples',
        price: '0,00',
        durationInMinutes: 30,
      };

      const result = serviceFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('maior que zero');
      }
    });

    it('deve rejeitar duração menor que 5 minutos ou maior que 480', () => {
      const invalidShort = {
        title: 'Corte Rápido',
        price: '20,00',
        durationInMinutes: 2,
      };
      expect(serviceFormSchema.safeParse(invalidShort).success).toBe(false);

      const invalidLong = {
        title: 'Mega Procedimento',
        price: '500,00',
        durationInMinutes: 600,
      };
      expect(serviceFormSchema.safeParse(invalidLong).success).toBe(false);
    });
  });

  describe('maskCurrencyInput', () => {
    it('deve retornar string vazia para entrada vazia ou sem dígitos', () => {
      expect(maskCurrencyInput('')).toBe('');
      expect(maskCurrencyInput('abc')).toBe('');
    });

    it('deve formatar centavos acumulativos em tempo real', () => {
      expect(maskCurrencyInput('4')).toBe('0,04');
      expect(maskCurrencyInput('45')).toBe('0,45');
      expect(maskCurrencyInput('450')).toBe('4,50');
      expect(maskCurrencyInput('4500')).toBe('45,00');
      expect(maskCurrencyInput('123456')).toBe('1.234,56');
    });

    it('deve preservar formatação ao reprocessar valor já formatado', () => {
      expect(maskCurrencyInput('45,00')).toBe('45,00');
      expect(maskCurrencyInput('R$ 45,00')).toBe('45,00');
    });
  });
});
