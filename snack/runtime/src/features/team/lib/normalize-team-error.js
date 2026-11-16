import { ApiError } from '../../../shared/api';
export function normalizeTeamError(error) {
    var _a, _b, _c, _d;
    if (error instanceof ApiError) {
        const data = (_a = error.data) !== null && _a !== void 0 ? _a : {};
        const code = data.code || error.code || 'UNKNOWN_ERROR';
        const message = data.message || data.error || error.message || 'Ocorreu um erro na operação.';
        const blockingBookingIds = Array.isArray(data.blockingBookingIds)
            ? data.blockingBookingIds
            : [];
        let retryAfterSeconds;
        if (typeof data.retryAfterSeconds === 'number') {
            retryAfterSeconds = data.retryAfterSeconds;
        }
        else if (code === 'RESEND_COOLDOWN') {
            const match = message.match(/(\d+)\s*segundos/i);
            if (match && match[1]) {
                retryAfterSeconds = parseInt(match[1], 10);
            }
        }
        return {
            code,
            message,
            blockingBookingIds,
            blockingCount: blockingBookingIds.length,
            retryAfterSeconds,
        };
    }
    if (error && typeof error === 'object') {
        const errObj = error;
        const responseData = (_d = (_c = (_b = errObj.response) === null || _b === void 0 ? void 0 : _b.data) !== null && _c !== void 0 ? _c : errObj.data) !== null && _d !== void 0 ? _d : {};
        const code = responseData.code || errObj.code || 'UNKNOWN_ERROR';
        const message = responseData.message ||
            responseData.error ||
            errObj.message ||
            'Ocorreu um erro na operação.';
        const blockingBookingIds = Array.isArray(responseData.blockingBookingIds)
            ? responseData.blockingBookingIds
            : [];
        let retryAfterSeconds;
        if (typeof responseData.retryAfterSeconds === 'number') {
            retryAfterSeconds = responseData.retryAfterSeconds;
        }
        return {
            code,
            message,
            blockingBookingIds,
            blockingCount: blockingBookingIds.length,
            retryAfterSeconds,
        };
    }
    return {
        code: 'UNKNOWN_ERROR',
        message: String(error !== null && error !== void 0 ? error : 'Ocorreu um erro inesperado.'),
        blockingBookingIds: [],
        blockingCount: 0,
    };
}
