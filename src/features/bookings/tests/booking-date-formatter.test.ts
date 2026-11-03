import { describe, it, expect } from 'vitest';
import {
  formatBookingCalendarDate,
  formatBookingTimeRange,
  formatCentsToCurrency,
} from '../lib/booking-time';

describe('Booking Date and Time Formatter', () => {
  it('formata data ISO de calendário sem deslocamento para o dia anterior', () => {
    // Legado ISO com meia-noite UTC: 2026-11-06T00:00:00.000Z
    const shortFormatted = formatBookingCalendarDate('2026-11-06T00:00:00.000Z');
    expect(shortFormatted).toContain('6 de nov');

    const longFormatted = formatBookingCalendarDate('2026-11-06T00:00:00.000Z', { format: 'long' });
    expect(longFormatted).toContain('6 de novembro');
  });

  it('formata string de data simples YYYY-MM-DD', () => {
    const formatted = formatBookingCalendarDate('2026-11-06');
    expect(formatted).toContain('6 de nov');
  });

  it('formata objeto Date nativo preservando a data', () => {
    const d = new Date(2026, 10, 6, 15, 30);
    const formatted = formatBookingCalendarDate(d);
    expect(formatted).toContain('6 de nov');
  });

  it('retorna fallback seguro para entradas nulas ou vazias', () => {
    expect(formatBookingCalendarDate(null)).toBe('Data a confirmar');
    expect(formatBookingCalendarDate('')).toBe('Data a confirmar');
    expect(formatBookingCalendarDate('invalid-date')).toBe('Data a confirmar');
  });

  it('formata intervalo de horários com início e fim', () => {
    expect(formatBookingTimeRange('16:00', '16:30')).toBe('16:00 – 16:30');
    expect(formatBookingTimeRange('16:00:00', '16:30:00')).toBe('16:00 – 16:30');
  });

  it('formata horário com apenas início', () => {
    expect(formatBookingTimeRange('16:00')).toBe('16:00');
  });

  it('formata horário a partir de instantes ISO na timezone da unidade', () => {
    const startsAt = '2026-11-06T19:00:00.000Z'; // 16:00 em America/Sao_Paulo (UTC-3)
    const endsAt = '2026-11-06T19:30:00.000Z';   // 16:30 em America/Sao_Paulo (UTC-3)
    expect(formatBookingTimeRange(null, null, startsAt, endsAt)).toBe('16:00 – 16:30');
  });

  it('formata centavos para moeda BRL', () => {
    expect(formatCentsToCurrency(4000)).toMatch(/R\$\s*40,00/);
    expect(formatCentsToCurrency(15050)).toMatch(/R\$\s*150,50/);
  });
});
