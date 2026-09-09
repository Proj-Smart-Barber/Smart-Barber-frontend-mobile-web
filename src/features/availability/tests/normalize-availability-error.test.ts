import { describe, it, expect } from 'vitest';
import { normalizeAvailabilityError } from '../api/normalize-availability-error';
import { ApiError } from '@/shared/api';

describe('normalizeAvailabilityError', () => {
  it('mapeia 401 para sessão expirada', () => {
    const result = normalizeAvailabilityError(new ApiError('Unauthorized', 401));
    expect(result.isSessionExpired).toBe(true);
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
