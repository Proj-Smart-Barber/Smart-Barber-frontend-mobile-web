import { describe, it, expect } from 'vitest';
import { normalizeAuthError } from '../lib/normalize-auth-error';
import { ApiError } from '@/shared/api';

describe('normalizeAuthError', () => {
  it('deve identificar erro 401 de credenciais inválidas', () => {
    const apiError = new ApiError('Unauthorized', 401, { error: 'E-mail ou senha incorreto.' });
    const result = normalizeAuthError(apiError);

    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.message).toBe('E-mail ou senha incorretos.');
    expect(result.shouldClearSession).toBe(false);
  });

  it('deve identificar erro 409 de duplicidade de conta', () => {
    const apiError = new ApiError('Conflict', 409, { error: 'O CPF ou o E-mail já está em uso.' });
    const result = normalizeAuthError(apiError);

    expect(result.code).toBe('ACCOUNT_CONFLICT');
    expect(result.message).toContain('Já existe uma conta utilizando este CPF ou e-mail');
    expect(result.shouldClearSession).toBe(false);
  });

  it('deve identificar erro 500 com JsonWebTokenError e solicitar limpeza de sessão', () => {
    const apiError = new ApiError('Internal Server Error', 500, {
      error: {
        name: 'JsonWebTokenError',
        message: 'jwt malformed',
      },
    });
    const result = normalizeAuthError(apiError);

    expect(result.code).toBe('SESSION_INVALID');
    expect(result.shouldClearSession).toBe(true);
  });

  it('deve identificar erro 500 com TokenExpiredError e solicitar limpeza de sessão', () => {
    const apiError = new ApiError('Internal Server Error', 500, {
      error: {
        name: 'TokenExpiredError',
        message: 'jwt expired',
      },
    });
    const result = normalizeAuthError(apiError);

    expect(result.code).toBe('SESSION_EXPIRED');
    expect(result.message).toBe('Sua sessão expirou. Entre novamente.');
    expect(result.shouldClearSession).toBe(true);
  });

  it('NÃO deve deslogar nem limpar sessão em erro 500 genérico do servidor', () => {
    const apiError = new ApiError('Internal Server Error', 500, {
      error: 'Database connection failed',
    });
    const result = normalizeAuthError(apiError);

    expect(result.code).toBe('SERVER_ERROR');
    expect(result.message).toContain('Não foi possível concluir a operação agora');
    expect(result.shouldClearSession).toBe(false);
  });

  it('deve tratar falha de rede sem deslogar o usuário', () => {
    const apiError = new ApiError('Network Error', 0, null, true);
    const result = normalizeAuthError(apiError);

    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.message).toContain('Não foi possível conectar ao Smart Barber');
    expect(result.shouldClearSession).toBe(false);
  });
});
