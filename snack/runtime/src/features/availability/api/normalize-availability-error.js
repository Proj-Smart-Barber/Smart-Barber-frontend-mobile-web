/** Normalização de erros da Disponibilidade para mensagens amigáveis. */
import { ApiError } from '../../../shared/api';
/**
 * O backend pode responder token inválido/expirado como 500 contendo o erro
 * do jsonwebtoken no payload. Mantemos a mesma proteção usada pela Agenda
 * para encerrar a sessão de forma controlada.
 */
function isTokenErrorPayload(data) {
    const payload = JSON.stringify(data !== null && data !== void 0 ? data : '').toLowerCase();
    return (payload.includes('jsonwebtokenerror') ||
        payload.includes('tokenexpirederror') ||
        payload.includes('jwt expired') ||
        payload.includes('jwt malformed') ||
        payload.includes('invalid token') ||
        payload.includes('invalid signature'));
}
export function normalizeAvailabilityError(error) {
    var _a, _b, _c, _d;
    if (error instanceof ApiError) {
        if (error.status === 401 || isTokenErrorPayload(error.data)) {
            return {
                title: 'Sua sessão expirou.',
                description: 'Entre novamente para continuar configurando a disponibilidade.',
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
            const backendMessage = typeof ((_a = error.data) === null || _a === void 0 ? void 0 : _a.error) === 'string'
                ? error.data.error
                : typeof ((_c = (_b = error.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) === 'string'
                    ? error.data.error.message
                    : typeof ((_d = error.data) === null || _d === void 0 ? void 0 : _d.message) === 'string'
                        ? error.data.message
                        : typeof error.message === 'string' && error.message.length > 0
                            ? error.message
                            : null;
            return {
                title: 'Dados inválidos.',
                description: backendMessage !== null && backendMessage !== void 0 ? backendMessage : 'Verifique os campos preenchidos, os horários e possíveis conflitos.',
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
