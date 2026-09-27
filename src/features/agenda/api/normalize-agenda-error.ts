/**
 * Normalização de erros da Agenda para mensagens amigáveis (Design System, seção 28).
 */
import { ApiError } from '@/shared/api';

export interface NormalizedAgendaError {
  title: string;
  description: string;
  isNetworkError: boolean;
  isSessionExpired: boolean;
}

function isTokenErrorPayload(data: unknown): boolean {
  const payload = JSON.stringify(data ?? '').toLowerCase();

  return (
    payload.includes('jsonwebtokenerror') ||
    payload.includes('tokenexpirederror') ||
    payload.includes('jwt expired') ||
    payload.includes('jwt malformed') ||
    payload.includes('invalid token') ||
    payload.includes('invalid signature')
  );
}

export function normalizeAgendaError(error: unknown): NormalizedAgendaError {
  if (error instanceof ApiError) {
    if (error.status === 401 || isTokenErrorPayload(error.data)) {
      return {
        title: 'Sua sessão expirou.',
        description: 'Entre novamente para continuar acompanhando a agenda.',
        isNetworkError: false,
        isSessionExpired: true,
      };
    }
    if (error.isNetworkError) {
      return {
        title: 'Sem conexão agora.',
        description:
          'Não foi possível sincronizar a agenda. Verifique sua internet e tente novamente.',
        isNetworkError: true,
        isSessionExpired: false,
      };
    }
    return {
      title: 'Não foi possível carregar sua agenda.',
      description: 'Algo saiu do previsto do nosso lado. Tente novamente em instantes.',
      isNetworkError: false,
      isSessionExpired: false,
    };
  }

  return {
    title: 'Não foi possível carregar sua agenda.',
    description: 'Tente novamente em instantes.',
    isNetworkError: false,
    isSessionExpired: false,
  };
}
