import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { normalizeAgendaError } from '../api/normalize-agenda-error';

describe('normalizeAgendaError', () => {
  it('marca 401 como sessão expirada', () => {
    const result = normalizeAgendaError(
      new ApiError('Token is missing!', 401, { message: 'Token is missing!' }),
    );

    expect(result.isSessionExpired).toBe(true);
    expect(result.title).toBe('Sua sessão expirou.');
  });

  it('marca 500 com JsonWebTokenError como sessão expirada (payload real do back)', () => {
    const result = normalizeAgendaError(
      new ApiError('invalid token', 500, {
        error: { name: 'JsonWebTokenError', message: 'invalid token' },
      }),
    );

    expect(result.isSessionExpired).toBe(true);
  });

  it('marca 500 com TokenExpiredError como sessão expirada', () => {
    const result = normalizeAgendaError(
      new ApiError('jwt expired', 500, {
        error: { name: 'TokenExpiredError', message: 'jwt expired' },
      }),
    );

    expect(result.isSessionExpired).toBe(true);
  });

  it('mantém 500 genérico sem derrubar a sessão', () => {
    const result = normalizeAgendaError(new ApiError('boom', 500, { error: 'Erro interno' }));

    expect(result.isSessionExpired).toBe(false);
    expect(result.title).toBe('Não foi possível carregar sua agenda.');
  });

  it('trata erro de rede sem sessão expirada', () => {
    const result = normalizeAgendaError(new ApiError('offline', 0, null, true));

    expect(result.isNetworkError).toBe(true);
    expect(result.isSessionExpired).toBe(false);
  });

  it('tem fallback para erros desconhecidos', () => {
    const result = normalizeAgendaError(new Error('qualquer coisa'));

    expect(result.isSessionExpired).toBe(false);
    expect(result.title).toBe('Não foi possível carregar sua agenda.');
  });
});
