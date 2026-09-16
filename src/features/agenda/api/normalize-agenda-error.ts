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

export function normalizeAgendaError(error: unknown): NormalizedAgendaError {
  if (error instanceof ApiError) {
    if (error.status === 401) {
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
