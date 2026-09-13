/** Normalização de erros da Disponibilidade para mensagens amigáveis. */
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

    if (error.status === 403) {
      return {
        title: 'Ação não permitida.',
        description: 'Você não possui permissão para alterar esta configuração.',
        isNetworkError: false,
        isSessionExpired: false,
      };
    }

    if (error.status === 404) {
      return {
        title: 'Registro não encontrado.',
        description: 'A informação solicitada não existe mais ou não pertence a esta unidade.',
        isNetworkError: false,
        isSessionExpired: false,
      };
    }

    if (error.isNetworkError) {
      return {
        title: 'Sem conexão agora.',
        description: 'Verifique sua internet e tente novamente.',
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
        description: 'Existe um conflito na configuração. Revise os intervalos e tente novamente.',
        isNetworkError: false,
        isSessionExpired: false,
      };
    }

    return {
      title: 'Não foi possível concluir.',
      description: 'Algo saiu do previsto do nosso lado. Tente novamente em instantes.',
      isNetworkError: false,
      isSessionExpired: false,
    };
  }

  return {
    title: 'Não foi possível concluir.',
    description: error instanceof Error && error.message ? error.message : 'Tente novamente em instantes.',
    isNetworkError: false,
    isSessionExpired: false,
  };
}
