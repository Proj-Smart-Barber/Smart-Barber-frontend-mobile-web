import { ApiError } from '@/shared/api';

export interface AuthoritativeQuote {
  serviceItems: Array<{
    serviceId: string | null;
    title: string;
    priceInCents: number | null;
    durationInMinutes: number | null;
    legacyAggregate?: boolean;
  }>;
  totalPriceInCents: number;
  totalDurationInMinutes: number;
}

export type BookingErrorCode =
  | 'SLOT_UNAVAILABLE'
  | 'QUOTE_CHANGED'
  | 'BOOKING_VERSION_CONFLICT'
  | 'ACTION_DEADLINE_PASSED'
  | 'MEMBERSHIP_INACTIVE'
  | 'IDEMPOTENCY_PAYLOAD_MISMATCH'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'IDEMPOTENCY_KEY_FUTURE_TIMESTAMP'
  | 'IDEMPOTENCY_KEY_EXPIRED'
  | 'OPERATION_ALREADY_CLOSED'
  | 'TERMINAL_BOOKING_STATE'
  | 'CUSTOMER_NOT_ELIGIBLE'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_OR_TIMEOUT'
  | 'UNKNOWN_ERROR';

export interface NormalizedBookingError {
  code: BookingErrorCode;
  message: string;
  statusCode: number;
  isQuoteChanged: boolean;
  quote?: AuthoritativeQuote | null;
  operationState?: 'APPLIED' | 'NOT_APPLIED' | 'PENDING' | 'UNKNOWN' | null;
  currentVersion?: number | null;
  serverTime?: string | null;
  isNetworkError: boolean;
  rawError: unknown;
}

export function normalizeBookingError(error: unknown): NormalizedBookingError {
  if (error instanceof ApiError) {
    const rawData = error.data as Record<string, any> | null;
    const explicitCode =
      (rawData?.code as string | undefined) ||
      (rawData?.error as string | undefined) ||
      '';

    const message =
      rawData?.message ||
      rawData?.error ||
      error.message ||
      'Ocorreu um erro no processamento do agendamento.';

    if (error.isNetworkError) {
      return {
        code: 'NETWORK_OR_TIMEOUT',
        message: 'Falha de comunicação ou tempo limite esgotado. A operação permanece incerta até reconciliação.',
        statusCode: 0,
        isQuoteChanged: false,
        isNetworkError: true,
        rawError: error,
      };
    }

    if (error.status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.',
        statusCode: 429,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (error.status === 503) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
        statusCode: 503,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'QUOTE_CHANGED' || (error.status === 409 && rawData?.quote)) {
      return {
        code: 'QUOTE_CHANGED',
        message: message || 'Os valores ou durações dos serviços mudaram. Revise o novo orçamento.',
        statusCode: error.status,
        isQuoteChanged: true,
        quote: rawData?.quote ?? null,
        operationState: rawData?.operationState ?? 'NOT_APPLIED',
        serverTime: rawData?.serverTime ?? null,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'BOOKING_VERSION_CONFLICT') {
      return {
        code: 'BOOKING_VERSION_CONFLICT',
        message: message || 'Este agendamento foi modificado por outra operação. Atualize as informações.',
        statusCode: error.status,
        isQuoteChanged: false,
        currentVersion: rawData?.currentVersion ?? null,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'ACTION_DEADLINE_PASSED') {
      return {
        code: 'ACTION_DEADLINE_PASSED',
        message: message || 'O prazo limite para esta alteração já expirou.',
        statusCode: error.status,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'MEMBERSHIP_INACTIVE') {
      return {
        code: 'MEMBERSHIP_INACTIVE',
        message: message || 'O profissional não possui vínculo ativo nesta unidade.',
        statusCode: error.status,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'SLOT_UNAVAILABLE' || explicitCode === 'BookingConflictError') {
      return {
        code: 'SLOT_UNAVAILABLE',
        message: message || 'O horário selecionado não está mais disponível.',
        statusCode: error.status,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
      return {
        code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
        message: 'Payload incompatível com a chave de tentativa anterior.',
        statusCode: error.status,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'INVALID_IDEMPOTENCY_KEY') {
      return {
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: message || 'Chave de tentativa inválida.',
        statusCode: error.status,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'TERMINAL_BOOKING_STATE') {
      return {
        code: 'TERMINAL_BOOKING_STATE',
        message: message || 'O agendamento já está em estado final e não pode ser alterado.',
        statusCode: error.status,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (explicitCode === 'CUSTOMER_NOT_ELIGIBLE') {
      return {
        code: 'CUSTOMER_NOT_ELIGIBLE',
        message: message || 'Cliente não elegível para este agendamento.',
        statusCode: error.status,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (error.status === 404) {
      return {
        code: 'NOT_FOUND',
        message: message || 'Recurso não encontrado.',
        statusCode: 404,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    if (error.status === 403) {
      return {
        code: 'FORBIDDEN',
        message: message || 'Ação não permitida para o seu usuário nesta unidade.',
        statusCode: 403,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message,
      statusCode: error.status,
      isQuoteChanged: false,
      isNetworkError: false,
      rawError: error,
    };
  }

  const message = error instanceof Error ? error.message : 'Erro inesperado no agendamento.';
  return {
    code: 'UNKNOWN_ERROR',
    message,
    statusCode: 500,
    isQuoteChanged: false,
    isNetworkError: false,
    rawError: error,
  };
}
