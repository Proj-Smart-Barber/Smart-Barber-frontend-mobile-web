import { ApiError } from '@/shared/api';

export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_CONFLICT'
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR';

export interface NormalizedAuthError {
  code: AuthErrorCode;
  message: string;
  originalError?: unknown;
  shouldClearSession: boolean;
}

export function normalizeAuthError(err: unknown): NormalizedAuthError {
  if (err instanceof ApiError) {
    if (err.isNetworkError) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Não foi possível conectar ao Smart Barber. Verifique sua conexão e tente novamente.',
        originalError: err,
        shouldClearSession: false,
      };
    }

    const errorBody = err.data;
    const errorStr = JSON.stringify(errorBody || '').toLowerCase();

    // 1. Detecção de Token malformado ou inválido (pode vir em 401 ou 500 com JsonWebTokenError)
    if (
      err.status === 401 ||
      err.status === 404 ||
      errorStr.includes('jsonwebtokenerror') ||
      errorStr.includes('jwt malformed') ||
      errorStr.includes('invalid signature') ||
      errorStr.includes('invalid token')
    ) {
      if (errorStr.includes('tokenexpirederror') || errorStr.includes('jwt expired')) {
        return {
          code: 'SESSION_EXPIRED',
          message: 'Sua sessão expirou. Entre novamente.',
          originalError: err,
          shouldClearSession: true,
        };
      }

      if (err.status === 401 && !errorStr.includes('token') && !errorStr.includes('jwt')) {
        // Credencial inválida em endpoint de login
        return {
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha incorretos.',
          originalError: err,
          shouldClearSession: false,
        };
      }

      return {
        code: 'SESSION_INVALID',
        message: 'Sua sessão não é válida. Entre novamente.',
        originalError: err,
        shouldClearSession: true,
      };
    }

    // 2. Detecção de Token expirado retornado como 500
    if (errorStr.includes('tokenexpirederror') || errorStr.includes('jwt expired')) {
      return {
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou. Entre novamente.',
        originalError: err,
        shouldClearSession: true,
      };
    }

    // 3. Conflito de conta (409) - e-mail ou CPF duplicado
    if (err.status === 409 || errorStr.includes('já está em uso') || errorStr.includes('already in use')) {
      return {
        code: 'ACCOUNT_CONFLICT',
        message: 'Já existe uma conta utilizando este CPF ou e-mail.',
        originalError: err,
        shouldClearSession: false,
      };
    }

    // 4. Erro de validação (400)
    if (err.status === 400) {
      const customMsg =
        typeof errorBody?.error === 'string'
          ? errorBody.error
          : errorBody?.message || 'Dados fornecidos são inválidos. Verifique os campos.';

      return {
        code: 'VALIDATION_ERROR',
        message: customMsg,
        originalError: err,
        shouldClearSession: false,
      };
    }

    // 5. Erro interno de servidor (500 genérico)
    if (err.status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'Não foi possível concluir a operação agora. Tente novamente em instantes.',
        originalError: err,
        shouldClearSession: false, // 500 genérico NUNCA apaga sessão
      };
    }
  }

  // Fallback para erros desconhecidos
  const rawMsg = err instanceof Error ? err.message : String(err);
  return {
    code: 'SERVER_ERROR',
    message: rawMsg || 'Não foi possível concluir a operação agora. Tente novamente em instantes.',
    originalError: err,
    shouldClearSession: false,
  };
}
