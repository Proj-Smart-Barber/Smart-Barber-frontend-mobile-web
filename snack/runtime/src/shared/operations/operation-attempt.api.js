import { httpClient, ApiError } from '../api';
const VALID_OPERATION_STATES = new Set([
    'PENDING',
    'APPLIED',
    'NOT_APPLIED',
    'UNKNOWN',
]);
function parseOperationState(rawState) {
    if (typeof rawState === 'string' && VALID_OPERATION_STATES.has(rawState)) {
        return rawState;
    }
    return 'UNKNOWN';
}
function parseServerTime(rawTime) {
    if (typeof rawTime === 'string' && rawTime.trim() !== '') {
        return rawTime;
    }
    return undefined;
}
export async function findOwnAttempt(requestId) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (!requestId) {
        throw new Error('requestId é obrigatório para consultar tentativa de operação.');
    }
    try {
        const raw = await httpClient.get(`/api/operation-attempts/${encodeURIComponent(requestId)}`);
        const state = parseOperationState((_a = raw === null || raw === void 0 ? void 0 : raw.state) !== null && _a !== void 0 ? _a : (_b = raw === null || raw === void 0 ? void 0 : raw.attempt) === null || _b === void 0 ? void 0 : _b.state);
        const operation = (_c = raw === null || raw === void 0 ? void 0 : raw.operation) !== null && _c !== void 0 ? _c : (_d = raw === null || raw === void 0 ? void 0 : raw.attempt) === null || _d === void 0 ? void 0 : _d.operation;
        const resource = (_e = raw === null || raw === void 0 ? void 0 : raw.resource) !== null && _e !== void 0 ? _e : (_f = raw === null || raw === void 0 ? void 0 : raw.attempt) === null || _f === void 0 ? void 0 : _f.resource;
        const accessChanged = (_j = (_g = raw === null || raw === void 0 ? void 0 : raw.accessChanged) !== null && _g !== void 0 ? _g : (_h = raw === null || raw === void 0 ? void 0 : raw.attempt) === null || _h === void 0 ? void 0 : _h.accessChanged) !== null && _j !== void 0 ? _j : false;
        const serverTime = parseServerTime((_k = raw === null || raw === void 0 ? void 0 : raw.serverTime) !== null && _k !== void 0 ? _k : (_l = raw === null || raw === void 0 ? void 0 : raw.attempt) === null || _l === void 0 ? void 0 : _l.serverTime);
        return {
            state,
            operation,
            resource,
            accessChanged,
            serverTime,
        };
    }
    catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            // 404 é estritamente UNKNOWN, nunca prova de NOT_APPLIED nem tempo autoritativo inventado
            return {
                state: 'UNKNOWN',
            };
        }
        throw err;
    }
}
export async function closeOwnAttempt(requestId) {
    var _a, _b;
    if (!requestId) {
        throw new Error('requestId é obrigatório para encerrar tentativa de operação.');
    }
    const raw = await httpClient.post(`/api/operation-attempts/${encodeURIComponent(requestId)}/close`);
    const state = parseOperationState(raw === null || raw === void 0 ? void 0 : raw.state);
    const operation = (_a = raw === null || raw === void 0 ? void 0 : raw.operation) !== null && _a !== void 0 ? _a : 'CLOSED';
    const resource = raw === null || raw === void 0 ? void 0 : raw.resource;
    const accessChanged = (_b = raw === null || raw === void 0 ? void 0 : raw.accessChanged) !== null && _b !== void 0 ? _b : false;
    const serverTime = parseServerTime(raw === null || raw === void 0 ? void 0 : raw.serverTime);
    return {
        state,
        operation,
        resource,
        accessChanged,
        serverTime,
    };
}
