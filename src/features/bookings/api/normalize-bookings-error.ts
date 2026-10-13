/**
 * Normalização de erros dos atendimentos para mensagens amigáveis.
 */
import { ApiError } from '@/shared/api';

export interface NormalizedBookingsError {
  title: string;
  description: string;
  isNetworkError: boolean;
  isSessionExpired: boolean;
  isConflict: boolean;
  isNotFound: boolean;
}

function isTokenErrorPayload(data: unknown): boolean {
  const payload = JSON.stringify(data ?? '').toLowerCase();

  return (
    payload.includes('token_expired') ||
    payload.includes('invalid_token') ||
    payload.includes('jsonwebtokenerror') ||
    payload.includes('tokenexpirederror') ||
    payload.includes('jwt expired') ||
    payload.includes('jwt malformed') ||
    payload.includes('invalid token') ||
    payload.includes('invalid signature')
  );
}

const SESSION_EXPIRED: NormalizedBookingsError = {
  title: 'Sua sessão expirou.',
  description: 'Entre novamente para gerenciar seus atendimentos.',
  isNetworkError: false,
  isSessionExpired: true,
  isConflict: false,
  isNotFound: false,
};

export function normalizeBookingsError(error: unknown): NormalizedBookingsError {
  if (error instanceof ApiError) {
    if (error.status === 401 || isTokenErrorPayload(error.data)) {
      return SESSION_EXPIRED;
    }

    if (error.status === 409) {
      return {
        title: 'Horário indisponível.',
        description:
          'Você já tem outro atendimento nesse horário. Escolha um novo horário para remarcar.',
        isNetworkError: false,
        isSessionExpired: false,
        isConflict: true,
        isNotFound: false,
      };
    }

    if (error.status === 404) {
      return {
        title: 'Agendamento não encontrado.',
        description: 'Ele pode ter sido cancelado ou removido. Atualize a lista de atendimentos.',
        isNetworkError: false,
        isSessionExpired: false,
        isConflict: false,
        isNotFound: true,
      };
    }

    if (error.isNetworkError) {
      return {
        title: 'Sem conexão agora.',
        description: 'Verifique sua internet e tente novamente.',
        isNetworkError: true,
        isSessionExpired: false,
        isConflict: false,
        isNotFound: false,
      };
    }

    return {
      title: 'Não foi possível concluir a ação.',
      description: 'Algo saiu do previsto do nosso lado. Tente novamente em instantes.',
      isNetworkError: false,
      isSessionExpired: false,
      isConflict: false,
      isNotFound: false,
    };
  }

  return {
    title: 'Não foi possível concluir a ação.',
    description: 'Tente novamente em instantes.',
    isNetworkError: false,
    isSessionExpired: false,
    isConflict: false,
    isNotFound: false,
  };
}
