import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/api-errors';
import { normalizeBarberScheduleError } from '../api/barber-schedule-error';

describe('erros HTTP da jornada individual', () => {
  it.each([
    { error: 'Fora do funcionamento da unidade.' },
    { message: 'Fora do funcionamento da unidade.' },
    { error: { message: 'Fora do funcionamento da unidade.', code: 'LEGACY' } },
  ])('preserva a mensagem de validação: %j', data => {
    const result = normalizeBarberScheduleError(new ApiError('HTTP 400', 400, data), true);
    expect(result.message).toBe('Fora do funcionamento da unidade.');
    expect(result.writeState).toBe('rejected');
  });

  it('converte caminhos Zod em campos e mantém mensagens individuais', () => {
    const result = normalizeBarberScheduleError(new ApiError('HTTP 400', 400, {
      error: 'Validation error', errors: [
        { path: ['schedules', 0, 'openTime'], message: 'Abertura inválida.' },
        { path: ['schedules', 1, 'closeTime'], message: 'Fechamento inválido.' },
      ],
    }));
    expect(result.message).toBe('Abertura inválida.');
    expect(result.details).toEqual([
      { field: 'schedules[0].openTime', reason: 'Abertura inválida.' },
      { field: 'schedules[1].closeTime', reason: 'Fechamento inválido.' },
    ]);
  });

  it('preserva código e conflitos sem copiar dados pessoais extras', () => {
    const conflict = { bookingId: 'booking', barbermanId: 'barber', date: '2026-12-07',
      startTime: '10:00', endTime: '10:30' };
    const result = normalizeBarberScheduleError(new ApiError('HTTP 409', 409, {
      error: 'Conflict', code: 'SCHEDULE_BOOKING_CONFLICT',
      conflicts: [{ ...conflict, customerName: 'Não exibir', email: 'private@example.com' }, null],
    }), true);
    expect(result.code).toBe('SCHEDULE_BOOKING_CONFLICT');
    expect(result.conflicts).toEqual([conflict]);
    expect(result.message).toContain('reservas');
    expect(result.writeState).toBe('rejected');
  });

  it.each([[401, 'sessão expirou'], [403, 'autorização'], [409, 'reserva'], [400, 'Revise']])(
    'mantém mensagem útil para HTTP %s', (status, message) => {
      expect(normalizeBarberScheduleError(new ApiError('HTTP', Number(status), {})).message).toContain(message);
    },
  );

  it('mantém compatibilidade com detalhes antigos', () => {
    const result = normalizeBarberScheduleError(new ApiError('HTTP', 422, {
      error: { code: 'INVALID', message: 'Horário inválido', details: [{ dayOfWeek: 'MONDAY', reason: 'Sobreposição' }] },
    }));
    expect(result.code).toBe('INVALID');
    expect(result.details[0]).toMatchObject({ dayOfWeek: 'MONDAY', reason: 'Sobreposição' });
  });

  it.each([null, [], { error: null, errors: [null, { path: 'invalid' }] }])(
    'não quebra com envelope inesperado: %j', data => {
      expect(() => normalizeBarberScheduleError(new ApiError('HTTP', 400, data))).not.toThrow();
    },
  );

  it('rede durante escrita é incerta, mas leitura isolada não é uma escrita', () => {
    const cause = new ApiError('Offline', 0, null, true);
    expect(normalizeBarberScheduleError(cause, true).writeState).toBe('unknown');
    expect(normalizeBarberScheduleError(cause).writeState).toBe('rejected');
  });
});
