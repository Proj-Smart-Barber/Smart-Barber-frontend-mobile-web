export const SCHEDULE_ERROR_CODES = {
    versionConflict: 'SCHEDULE_VERSION_CONFLICT',
    bookingConflict: 'SCHEDULE_BOOKING_CONFLICT',
    customConflict: 'SCHEDULE_CUSTOM_CONFLICT',
    payloadMismatch: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
    operationClosed: 'OPERATION_ALREADY_CLOSED',
};
const NO_CONFLICTS = { bookings: [], customSchedules: [] };
/** Distinguishes a rejected write from a confirmed write whose reread failed. */
export class BarberScheduleError extends Error {
    constructor(message, status, code, writeState = 'rejected', details = [], conflicts = NO_CONFLICTS) {
        super(message);
        this.status = status;
        this.code = code;
        this.writeState = writeState;
        this.details = details;
        this.conflicts = conflicts;
    }
}
const TERMINAL_CONFLICT_CODES = [
    SCHEDULE_ERROR_CODES.versionConflict,
    SCHEDULE_ERROR_CODES.bookingConflict,
    SCHEDULE_ERROR_CODES.customConflict,
    SCHEDULE_ERROR_CODES.payloadMismatch,
];
const MESSAGES = {
    401: 'Sua sessão expirou. Entre novamente para continuar.',
    403: 'Você não tem autorização para alterar a jornada nesta unidade.',
    404: 'Unidade ou profissional não encontrado neste vínculo.',
    422: 'Revise os horários informados e o funcionamento da unidade.',
};
const CODE_MESSAGES = {
    [SCHEDULE_ERROR_CODES.versionConflict]: 'A jornada foi alterada por outra sessão. Recarregue os dados salvos e revise sua edição.',
    [SCHEDULE_ERROR_CODES.bookingConflict]: 'A alteração deixaria reservas futuras fora da jornada. Ajuste a Agenda ou os horários.',
    [SCHEDULE_ERROR_CODES.customConflict]: 'A alteração conflita com jornadas individuais da equipe. Revise a Equipe.',
    [SCHEDULE_ERROR_CODES.payloadMismatch]: 'A tentativa anterior foi registrada com outro conteúdo. Consulte o resultado antes de continuar.',
};
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function asList(value) {
    return Array.isArray(value) ? value.map(asRecord).filter((v) => v !== null) : [];
}
const str = (value) => (typeof value === 'string' ? value : '');
/** Lê code/message do envelope real: `{ code, message, error: { code, message, details } }` ou `{ error: 'texto' }`. */
export function readScheduleEnvelope(data) {
    var _a, _b, _c, _d;
    const body = ((_a = asRecord(data)) !== null && _a !== void 0 ? _a : {});
    const nested = asRecord(body.error);
    const code = str(body.code) || str(nested === null || nested === void 0 ? void 0 : nested.code) || '';
    const message = str(nested === null || nested === void 0 ? void 0 : nested.message) || str(body.message) || (typeof body.error === 'string' ? body.error : '');
    const rawDetails = (_c = (_b = nested === null || nested === void 0 ? void 0 : nested.details) !== null && _b !== void 0 ? _b : body.errors) !== null && _c !== void 0 ? _c : body.conflicts;
    return { code, message, rawDetails, conflicts: (_d = body.conflicts) !== null && _d !== void 0 ? _d : nested === null || nested === void 0 ? void 0 : nested.details };
}
function parseConflicts(code, source) {
    const list = asList(source);
    if (code === SCHEDULE_ERROR_CODES.bookingConflict) {
        return { bookings: list.map(i => ({ bookingId: str(i.bookingId), date: str(i.date),
                startTime: str(i.startTime), endTime: str(i.endTime), barbermanId: str(i.barbermanId) }))
                .filter(i => i.bookingId), customSchedules: [] };
    }
    if (code === SCHEDULE_ERROR_CODES.customConflict) {
        return { bookings: [], customSchedules: list.map(i => ({ barbermanId: str(i.barbermanId),
                dayOfWeek: str(i.dayOfWeek), openTime: str(i.openTime), closeTime: str(i.closeTime) }))
                .filter(i => i.barbermanId) };
    }
    return NO_CONFLICTS;
}
function parseDetails(code, source) {
    if (code !== 'VALIDATION_ERROR')
        return [];
    return asList(source).map(issue => {
        const path = Array.isArray(issue.path) ? issue.path : [];
        const field = path.reduce((acc, part) => typeof part === 'number' ? `${acc}[${part}]`
            : acc ? `${acc}.${String(part)}` : String(part), '');
        return { field: field || str(issue.field) || undefined, dayOfWeek: str(issue.dayOfWeek) || undefined,
            reason: str(issue.message) || undefined };
    });
}
/**
 * Classifica falhas de leitura/escrita. Durante uma escrita só uma rejeição HTTP terminal
 * prova que nada foi aplicado; rede, 5xx e 409 ambíguo permanecem 'unknown' até reconciliar.
 */
export function normalizeBarberScheduleError(error, duringWrite = false) {
    var _a;
    if (error instanceof BarberScheduleError)
        return error;
    if (error && typeof error === 'object' && 'status' in error) {
        const raw = error;
        const envelope = readScheduleEnvelope(raw.data);
        const code = envelope.code || (raw.status === 0 ? 'NETWORK_ERROR' : 'SCHEDULE_ERROR');
        const ambiguousConflict = raw.status === 409 && !TERMINAL_CONFLICT_CODES.includes(code);
        const indeterminate = raw.isNetworkError || raw.status === 0 || raw.status >= 500 || ambiguousConflict;
        return new BarberScheduleError((_a = CODE_MESSAGES[code]) !== null && _a !== void 0 ? _a : (envelope.message || MESSAGES[raw.status]
            || 'Não foi possível concluir a operação. Tente novamente.'), raw.status, code, duringWrite && indeterminate ? 'unknown' : 'rejected', parseDetails(code, envelope.rawDetails), parseConflicts(code, envelope.conflicts));
    }
    return new BarberScheduleError('Não foi possível carregar a jornada. Verifique sua conexão e tente novamente.', 0, 'NETWORK_ERROR', duringWrite ? 'unknown' : 'rejected');
}
