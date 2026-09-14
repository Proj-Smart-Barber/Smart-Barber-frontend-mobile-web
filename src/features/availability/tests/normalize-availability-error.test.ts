import { describe, it, expect } from 'vitest';
import { normalizeAvailabilityError } from '../api/normalize-availability-error';
import { ApiError } from '@/shared/api';

describe('normalizeAvailabilityError', () => {
  it('mapeia 401 para sessão expirada', () => {
    const result = normalizeAvailabilityError(new ApiError('Unauthorized', 401));
    expect(result.isSessionExpired).toBe(true);
  });

  it('mapeia erro JWT retornado como 500 para sessão expirada', () => {
    const result = normalizeAvailabilityError(
      new ApiError('Internal Server Error', 500, {
        error: { name: 'TokenExpiredError', message: 'jwt expired' },
      }),
    );

    expect(result.isSessionExpired).toBe(true);
    expect(result.title).toContain('sessão');
  });

  it('mapeia isNetworkError para erro de conexão', () => {
    const result = normalizeAvailabilityError(new ApiError('Network error', 0, null, true));
    expect(result.isNetworkError).toBe(true);
    expect(result.title).toContain('conexão');
  });

  it('mapeia 400 para horário inválido', () => {
    const result = normalizeAvailabilityError(new ApiError('Bad Request', 400));
    expect(result.title).toContain('inválido');
  });

  it('preserva mensagem de validação enviada pelo backend em 400', () => {
    const result = normalizeAvailabilityError(
      new ApiError('Bad Request', 400, {
        error: 'O horário de fechamento deve ser maior que o de abertura.',
      }),
    );

    expect(result.description).toBe(
      'O horário de fechamento deve ser maior que o de abertura.',
    );
  });

  it('mapeia 409 para conflito de jornada', () => {
    const result = normalizeAvailabilityError(new ApiError('Conflict', 409));
    expect(result.title).toContain('Conflito');
  });

  it('usa fallback para erros desconhecidos', () => {
    const result = normalizeAvailabilityError(new Error('unknown'));
    expect(result.isNetworkError).toBe(false);
    expect(result.isSessionExpired).toBe(false);
  });
});

