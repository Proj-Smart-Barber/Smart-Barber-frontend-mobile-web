import { ApiError } from '../../../shared/api';
export function normalizeBookingError(error) {
    var _a, _b, _c, _d, _e, _f, _g;
    const isApiErr = error instanceof ApiError;
    const status = isApiErr
        ? error.status
        : typeof (error === null || error === void 0 ? void 0 : error.status) === 'number'
            ? error.status
            : typeof (error === null || error === void 0 ? void 0 : error.statusCode) === 'number'
                ? error.statusCode
                : 0;
    const rawData = (isApiErr ? error.data : ((_a = error === null || error === void 0 ? void 0 : error.data) !== null && _a !== void 0 ? _a : (typeof error === 'object' ? error : null)));
    const explicitCode = (rawData === null || rawData === void 0 ? void 0 : rawData.code) ||
        (rawData === null || rawData === void 0 ? void 0 : rawData.error) ||
        (error === null || error === void 0 ? void 0 : error.code) ||
        '';
    const isNetwork = Boolean((isApiErr && error.isNetworkError) ||
        (error === null || error === void 0 ? void 0 : error.isNetworkError) ||
        (error === null || error === void 0 ? void 0 : error.name) === 'AbortError' ||
        ((_b = error === null || error === void 0 ? void 0 : error.message) === null || _b === void 0 ? void 0 : _b.includes('timeout')) ||
        ((_c = error === null || error === void 0 ? void 0 : error.message) === null || _c === void 0 ? void 0 : _c.includes('conexão')));
    const message = (rawData === null || rawData === void 0 ? void 0 : rawData.message) ||
        (typeof (rawData === null || rawData === void 0 ? void 0 : rawData.error) === 'string' ? rawData.error : '') ||
        (error instanceof Error ? error.message : '') ||
        (error === null || error === void 0 ? void 0 : error.message) ||
        'Ocorreu um erro no processamento do agendamento.';
    if (isNetwork) {
        return {
            code: 'NETWORK_OR_TIMEOUT',
            message: 'Falha de comunicação ou tempo limite esgotado. A operação permanece incerta até reconciliação.',
            statusCode: 0,
            isQuoteChanged: false,
            isNetworkError: true,
            rawError: error,
        };
    }
    if (status === 429) {
        return {
            code: 'RATE_LIMITED',
            message: 'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.',
            statusCode: 429,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (status === 503) {
        return {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
            statusCode: 503,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'QUOTE_CHANGED' ||
        (status === 409 && (rawData === null || rawData === void 0 ? void 0 : rawData.quote)) ||
        (status === 409 && typeof message === 'string' && message.includes('alterado') && !explicitCode.includes('CONFLICT') && !explicitCode.includes('DEADLINE'))) {
        return {
            code: 'QUOTE_CHANGED',
            message: message || 'Os valores ou durações dos serviços mudaram. Revise o novo orçamento.',
            statusCode: status || 409,
            isQuoteChanged: true,
            quote: (_d = rawData === null || rawData === void 0 ? void 0 : rawData.quote) !== null && _d !== void 0 ? _d : null,
            operationState: (_e = rawData === null || rawData === void 0 ? void 0 : rawData.operationState) !== null && _e !== void 0 ? _e : 'NOT_APPLIED',
            serverTime: (_f = rawData === null || rawData === void 0 ? void 0 : rawData.serverTime) !== null && _f !== void 0 ? _f : null,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'BOOKING_VERSION_CONFLICT') {
        return {
            code: 'BOOKING_VERSION_CONFLICT',
            message: message || 'Este agendamento foi modificado por outra operação. Atualize as informações.',
            statusCode: status || 400,
            isQuoteChanged: false,
            currentVersion: (_g = rawData === null || rawData === void 0 ? void 0 : rawData.currentVersion) !== null && _g !== void 0 ? _g : null,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'ACTION_DEADLINE_PASSED') {
        return {
            code: 'ACTION_DEADLINE_PASSED',
            message: message || 'O prazo limite para esta alteração já expirou.',
            statusCode: status || 400,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'MEMBERSHIP_INACTIVE') {
        return {
            code: 'MEMBERSHIP_INACTIVE',
            message: message || 'O profissional não possui vínculo ativo nesta unidade.',
            statusCode: status || 400,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'SLOT_UNAVAILABLE' || explicitCode === 'BookingConflictError') {
        return {
            code: 'SLOT_UNAVAILABLE',
            message: message || 'O horário selecionado não está mais disponível.',
            statusCode: status || 400,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
        return {
            code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
            message: 'Payload incompatível com a chave de tentativa anterior.',
            statusCode: status || 400,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'INVALID_IDEMPOTENCY_KEY') {
        return {
            code: 'INVALID_IDEMPOTENCY_KEY',
            message: message || 'Chave de tentativa inválida.',
            statusCode: status || 400,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'TERMINAL_BOOKING_STATE') {
        return {
            code: 'TERMINAL_BOOKING_STATE',
            message: message || 'O agendamento já está em estado final e não pode ser alterado.',
            statusCode: status || 400,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (explicitCode === 'CUSTOMER_NOT_ELIGIBLE') {
        return {
            code: 'CUSTOMER_NOT_ELIGIBLE',
            message: message || 'Cliente não elegível para este agendamento.',
            statusCode: status || 400,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (status === 404) {
        return {
            code: 'NOT_FOUND',
            message: message || 'Recurso não encontrado.',
            statusCode: 404,
            isQuoteChanged: false,
            isNetworkError: false,
            rawError: error,
        };
    }
    if (status === 403) {
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
        statusCode: status || 500,
        isQuoteChanged: false,
        isNetworkError: false,
        rawError: error,
    };
}
