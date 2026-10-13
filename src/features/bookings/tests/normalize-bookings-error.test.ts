import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { normalizeBookingsError } from '../api/normalize-bookings-error';

describe('normalizeBookingsError', () => {
  it('trata 401 como sessão expirada', () => {
    const normalized = normalizeBookingsError(new ApiError('Não autorizado', 401, {}, false));

    expect(normalized.isSessionExpired).toBe(true);
    expect(normalized.isConflict).toBe(false);
    expect(normalized.title).toBe('Sua sessão expirou.');
  });

  it('trata payload token_expired do backend como sessão expirada', () => {
    const normalized = normalizeBookingsError(
      new ApiError('Token expirado', 500, { error: 'token_expired' }, false),
    );

    expect(normalized.isSessionExpired).toBe(true);
  });

  it('trata payload invalid_token do backend como sessão expirada', () => {
    const normalized = normalizeBookingsError(
      new ApiError('Token inválido', 500, { error: 'invalid_token' }, false),
    );

    expect(normalized.isSessionExpired).toBe(true);
  });

  it('trata 409 como conflito de horário', () => {
    const normalized = normalizeBookingsError(
      new ApiError('Conflito', 409, { error: 'Conflito de reserva.' }, false),
    );

    expect(normalized.isConflict).toBe(true);
    expect(normalized.isSessionExpired).toBe(false);
    expect(normalized.title).toBe('Horário indisponível.');
  });

  it('trata 404 como agendamento não encontrado', () => {
    const normalized = normalizeBookingsError(
      new ApiError('Reserva não encontrada.', 404, { error: 'Reserva não encontrada.' }, false),
    );

    expect(normalized.isNotFound).toBe(true);
    expect(normalized.title).toBe('Agendamento não encontrado.');
  });

  it('trata erros de rede', () => {
    const normalized = normalizeBookingsError(new ApiError('offline', 0, null, true));

    expect(normalized.isNetworkError).toBe(true);
    expect(normalized.isSessionExpired).toBe(false);
  });

  it('cai no padrão para erros desconhecidos', () => {
    const normalized = normalizeBookingsError(new Error('algo inesperado'));

    expect(normalized.isNetworkError).toBe(false);
    expect(normalized.isSessionExpired).toBe(false);
    expect(normalized.isConflict).toBe(false);
    expect(normalized.isNotFound).toBe(false);
    expect(normalized.title).toBe('Não foi possível concluir a ação.');
  });
});
