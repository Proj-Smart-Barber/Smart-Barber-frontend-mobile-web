/**
 * Normalização de erros da Disponibilidade para mensagens amigáveis.
 * Espelha normalize-agenda-error.ts (feat3): inspeciona err.status e
 * err.isNetworkError do ApiError — sem inventar campos que o backend
 * não retorna.
 */
import { ApiError } from '@/shared/api';

export interface NormalizedAvailabilityError {
  title: string;
  description: string;
  isNetworkError: boolean;
  isSessionExpired: boolean;
}

export function normalizeAvailabilityError(error: unknown): NormalizedAvailabilityError {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: 'Sua sessão expirou.',
        description: 'Entre novamente para continuar.',
        isNetworkError: false,
        isSessionExpired: true,
      };
    }

    if (error.isNetworkError) {
      return {
        title: 'Sem conexão agora.',
        description: 'Não foi possível salvar a jornada. Verifique sua internet e tente novamente.',
        isNetworkError: true,
        isSessionExpired: false,
      };
    }

    if (error.status === 400) {
      const backendMessage =
        typeof error.data?.error === 'string'
          ? error.data.error
          : typeof error.message === 'string' && error.message.length > 0
            ? error.message
            : null;

      return {
        title: 'Dados inválidos.',
        description:
          backendMessage ??
          'Verifique os campos preenchidos, os horários e possíveis conflitos.',
        isNetworkError: false,
        isSessionExpired: false,
      };
    }

    if (error.status === 409) {
      return {
        title: 'Conflito de jornada.',
        description: 'Existe sobreposição entre os intervalos definidos. Corrija antes de salvar.',
        isNetworkError: false,
        isSessionExpired: false,
      };
    }

    return {
      title: 'Não foi possível salvar a jornada.',
      description: 'Algo saiu do previsto do nosso lado. Tente novamente em instantes.',
      isNetworkError: false,
      isSessionExpired: false,
    };
  }

  return {
    title: 'Não foi possível salvar a jornada.',
    description: 'Tente novamente em instantes.',
    isNetworkError: false,
    isSessionExpired: false,
  };
}
