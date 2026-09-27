import { describe, expect, it } from 'vitest';
import type { AppointmentStatus } from '../model/appointment.types';
import { mapStatusBadgeTone, mapStatusLabel } from '../model/appointment.presentation';

describe('Appointment Presentation', () => {
  it('deve mapear status para labels em português amigáveis', () => {
    expect(mapStatusLabel('WAITING')).toBe('Aguardando');
    expect(mapStatusLabel('CONFIRMED')).toBe('Confirmado');
    expect(mapStatusLabel('IN_SERVICE')).toBe('Em atendimento');
    expect(mapStatusLabel('COMPLETED')).toBe('Concluído');
    expect(mapStatusLabel('CANCELLED')).toBe('Cancelado');
    expect(mapStatusLabel('NO_SHOW')).toBe('Não compareceu');
  });

  it('deve mapear status para tons semânticos de badge do design system', () => {
    const cases: [AppointmentStatus, 'brand' | 'success' | 'successAlt' | 'warning' | 'error' | 'info'][] = [
      ['WAITING', 'info'],
      ['CONFIRMED', 'successAlt'],
      ['IN_SERVICE', 'warning'],
      ['COMPLETED', 'success'],
      ['CANCELLED', 'error'],
      ['NO_SHOW', 'error'],
    ];
    cases.forEach(([status, tone]) => expect(mapStatusBadgeTone(status)).toBe(tone));
  });
});
