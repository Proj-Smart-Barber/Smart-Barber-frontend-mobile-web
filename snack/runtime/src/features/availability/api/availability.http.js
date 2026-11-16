/**
 * Adapter HTTP da Disponibilidade.
 *
 * Auditada contra o ZIP real do backend `feat/availability-engine` em
 * 2026-09-13. A UI/domínio continua independente dos detalhes de transporte.
 */
import { ApiError, httpClient } from '../../../shared/api';
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
];
function normalizeWeekday(value) {
    if (typeof value !== 'string')
        return null;
    const normalized = value.trim().toUpperCase();
    return WEEKDAYS.includes(normalized)
        ? normalized
        : null;
}
function isTime(value) {
    return typeof value === 'string' && TIME_PATTERN.test(value);
}
function normalizeBackendScheduleItem(item) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!item || typeof item !== 'object')
        return null;
    const raw = item;
    const id = (_b = (_a = raw.id) !== null && _a !== void 0 ? _a : raw.scheduleId) !== null && _b !== void 0 ? _b : raw.schedule_id;
    const weekday = normalizeWeekday((_c = raw.dayOfWeek) !== null && _c !== void 0 ? _c : raw.day_of_week);
    const barbermanId = (_e = (_d = raw.barbermanId) !== null && _d !== void 0 ? _d : raw.barberman_id) !== null && _e !== void 0 ? _e : null;
    const openTime = (_f = raw.openTime) !== null && _f !== void 0 ? _f : raw.open_time;
    const closeTime = (_g = raw.closeTime) !== null && _g !== void 0 ? _g : raw.close_time;
    if (typeof id !== 'string' || !weekday || !isTime(openTime) || !isTime(closeTime)) {
        return null;
    }
    return {
        id,
        weekday,
        barbermanId: typeof barbermanId === 'string' ? barbermanId : null,
        range: { start: openTime, end: closeTime },
    };
}
function normalizeBackendExceptionItem(item) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    if (!item || typeof item !== 'object')
        return null;
    const raw = item;
    const id = (_b = (_a = raw.id) !== null && _a !== void 0 ? _a : raw.exceptionId) !== null && _b !== void 0 ? _b : raw.exception_id;
    const date = raw.date;
    const barbermanId = (_d = (_c = raw.barbermanId) !== null && _c !== void 0 ? _c : raw.barberman_id) !== null && _d !== void 0 ? _d : null;
    const startTime = (_h = (_g = (_f = (_e = raw.startTime) !== null && _e !== void 0 ? _e : raw.start_time) !== null && _f !== void 0 ? _f : raw.openTime) !== null && _g !== void 0 ? _g : raw.open_time) !== null && _h !== void 0 ? _h : null;
    const endTime = (_m = (_l = (_k = (_j = raw.endTime) !== null && _j !== void 0 ? _j : raw.end_time) !== null && _k !== void 0 ? _k : raw.closeTime) !== null && _l !== void 0 ? _l : raw.close_time) !== null && _m !== void 0 ? _m : null;
    const reason = (_o = raw.reason) !== null && _o !== void 0 ? _o : null;
    if (typeof id !== 'string' || typeof date !== 'string')
        return null;
    return {
        id,
        date: date.slice(0, 10),
        barbermanId: typeof barbermanId === 'string' ? barbermanId : null,
        openTime: isTime(startTime) ? startTime : null,
        closeTime: isTime(endTime) ? endTime : null,
        reason: typeof reason === 'string' && reason.length > 0 ? reason : null,
    };
}
const SCOPE_STATES = ['INHERIT', 'CUSTOM', 'CLOSED'];
function parseScopeEntries(items, label) {
    if (!Array.isArray(items)) {
        throw new ApiError(`Resposta de jornada inválida: ${label} ausente.`, 502, null, false);
    }
    return items.map((item) => {
        const entry = normalizeBackendScheduleItem(item);
        if (!entry) {
            throw new ApiError(`Resposta de jornada inválida: item de ${label} malformado.`, 502, null, false);
        }
        return entry;
    });
}
/** Falha fechado: o editor nunca recebe um documento parcial que poderia apagar horários ao salvar. */
export function parseScheduleScopeDocument(raw, barbermanId) {
    var _a;
    const state = typeof (raw === null || raw === void 0 ? void 0 : raw.state) === 'string' ? raw.state.toUpperCase() : '';
    const version = raw === null || raw === void 0 ? void 0 : raw.version;
    if (!SCOPE_STATES.includes(state) ||
        typeof version !== 'number' ||
        !Number.isInteger(version) ||
        version < 0) {
        throw new ApiError('Resposta de jornada inválida: estado ou versão ausentes.', 502, null, false);
    }
    const needsReview = raw.needsReview;
    const serverTime = typeof (raw === null || raw === void 0 ? void 0 : raw.serverTime) === 'string' && raw.serverTime.trim() ? raw.serverTime : null;
    return {
        barbermanId,
        schedules: parseScopeEntries(raw === null || raw === void 0 ? void 0 : raw.schedules, 'schedules'),
        effectiveSchedules: parseScopeEntries((_a = raw === null || raw === void 0 ? void 0 : raw.effectiveSchedules) !== null && _a !== void 0 ? _a : raw === null || raw === void 0 ? void 0 : raw.schedules, 'effectiveSchedules'),
        state: state,
        version,
        needsReview: needsReview === true,
        serverTime,
    };
}
export class AvailabilityHttpAdapter {
    async getBarbershop(barbershopId) {
        const response = await httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}`);
        const raw = response === null || response === void 0 ? void 0 : response.barbershop;
        if (!raw ||
            typeof raw.id !== 'string' ||
            raw.id.trim().length === 0 ||
            typeof raw.name !== 'string' ||
            raw.name.trim().length === 0 ||
            typeof raw.timezone !== 'string' ||
            raw.timezone.trim().length === 0) {
            throw new ApiError('Resposta de barbearia inválida.', 500, response, false);
        }
        return {
            id: raw.id,
            name: raw.name,
            timezone: raw.timezone,
        };
    }
    async getScheduleScope(barbershopId, barbermanId) {
        const response = await httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedules`, { params: barbermanId ? { barbermanId } : undefined });
        return parseScheduleScopeDocument(response, barbermanId !== null && barbermanId !== void 0 ? barbermanId : null);
    }
    async saveScheduleScope(barbershopId, input) {
        if (input.entries.some((entry) => { var _a; return ((_a = entry.barbermanId) !== null && _a !== void 0 ? _a : null) !== input.barbermanId; })) {
            throw new ApiError('A jornada informada não corresponde ao escopo selecionado.', 400, { code: 'SCHEDULE_SCOPE_MISMATCH' }, false);
        }
        const body = {
            schedules: input.entries.map((entry) => ({
                dayOfWeek: entry.weekday,
                openTime: entry.range.start,
                closeTime: entry.range.end,
            })),
            state: input.state,
            expectedVersion: input.expectedVersion,
        };
        const response = await httpClient.put(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedules`, body, {
            params: input.barbermanId ? { barbermanId: input.barbermanId } : undefined,
            headers: { 'Idempotency-Key': input.requestId },
        });
        // 2xx com corpo ilegível não prova falha: o chamador trata (status 502) como incerto.
        return parseScheduleScopeDocument(response, input.barbermanId);
    }
    async getWeeklySchedule(barbershopId, barbermanId) {
        const response = await httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedules`, {
            params: barbermanId ? { barbermanId } : undefined,
        });
        const normalized = Array.isArray(response === null || response === void 0 ? void 0 : response.schedules)
            ? response.schedules
                .map(normalizeBackendScheduleItem)
                .filter((entry) => entry !== null)
            : [];
        // Na porta do frontend, ausência de barbermanId significa jornada geral.
        // O GET do backend, sem filtro, devolve todos os registros da unidade.
        return barbermanId
            ? normalized.filter((entry) => entry.barbermanId === barbermanId)
            : normalized.filter((entry) => entry.barbermanId === null);
    }
    async saveWeeklySchedule(barbershopId, entries, barbermanId) {
        var _a, _b, _c;
        const inferredScopes = new Set(entries.map((entry) => { var _a; return (_a = entry.barbermanId) !== null && _a !== void 0 ? _a : null; }));
        if (inferredScopes.size > 1) {
            throw new ApiError('Cada atualização de jornada deve pertencer a um único escopo.', 400, { code: 'MULTIPLE_SCHEDULE_SCOPES' }, false);
        }
        const inferredBarbermanId = (_b = (_a = entries[0]) === null || _a === void 0 ? void 0 : _a.barbermanId) !== null && _b !== void 0 ? _b : null;
        const scopeBarbermanId = (_c = barbermanId !== null && barbermanId !== void 0 ? barbermanId : inferredBarbermanId) !== null && _c !== void 0 ? _c : undefined;
        if (barbermanId &&
            entries.some((entry) => entry.barbermanId !== null && entry.barbermanId !== barbermanId)) {
            throw new ApiError('A jornada informada não corresponde ao profissional selecionado.', 400, { code: 'SCHEDULE_SCOPE_MISMATCH' }, false);
        }
        const body = {
            schedules: entries.map((entry) => ({
                dayOfWeek: entry.weekday,
                openTime: entry.range.start,
                closeTime: entry.range.end,
            })),
        };
        await httpClient.put(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedules`, body, {
            params: scopeBarbermanId ? { barbermanId: scopeBarbermanId } : undefined,
        });
        // O PUT faz replace atômico e retorna apenas mensagem. Recarregamos o
        // escopo persistido para manter o cache do frontend autoritativo.
        return this.getWeeklySchedule(barbershopId, scopeBarbermanId);
    }
    async listExceptions(barbershopId, barbermanId) {
        const response = await httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions`, {
            params: barbermanId ? { barbermanId } : undefined,
        });
        const normalized = Array.isArray(response === null || response === void 0 ? void 0 : response.exceptions)
            ? response.exceptions
                .map(normalizeBackendExceptionItem)
                .filter((entry) => entry !== null)
            : [];
        return barbermanId
            ? normalized.filter((entry) => entry.barbermanId === barbermanId)
            : normalized.filter((entry) => entry.barbermanId === null);
    }
    async createException(barbershopId, exception) {
        const body = {
            date: exception.date,
            barbermanId: exception.barbermanId,
            startTime: exception.openTime,
            endTime: exception.closeTime,
            reason: exception.reason,
        };
        const response = await httpClient.post(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions`, body);
        if (!response || typeof response.exceptionId !== 'string') {
            throw new ApiError('Resposta inválida ao criar exceção.', 500, response, false);
        }
        return {
            id: response.exceptionId,
            ...exception,
        };
    }
    async updateException(barbershopId, exceptionId, exception) {
        const body = {
            ...(exception.date !== undefined && { date: exception.date }),
            ...(exception.openTime !== undefined && { startTime: exception.openTime }),
            ...(exception.closeTime !== undefined && { endTime: exception.closeTime }),
            ...(exception.reason !== undefined && { reason: exception.reason }),
        };
        await httpClient.patch(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`, body);
        // O PATCH retorna 200 sem entidade. Releitura autoritativa evita manter
        // um espelho local e confirma o que realmente foi persistido pelo Drizzle.
        // Aqui buscamos a lista bruta (sem filtrar jornada geral/profissional), pois
        // a exceção editada pode pertencer a qualquer escopo.
        const refreshedResponse = await httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions`);
        const updated = Array.isArray(refreshedResponse === null || refreshedResponse === void 0 ? void 0 : refreshedResponse.exceptions)
            ? refreshedResponse.exceptions
                .map(normalizeBackendExceptionItem)
                .find((item) => (item === null || item === void 0 ? void 0 : item.id) === exceptionId)
            : undefined;
        if (!updated) {
            throw new ApiError('A exceção foi atualizada, mas não pôde ser recarregada.', 500, null, false);
        }
        return updated;
    }
    async removeException(barbershopId, exceptionId) {
        await httpClient.delete(`/api/barbershops/${encodeURIComponent(barbershopId)}/schedule-exceptions/${encodeURIComponent(exceptionId)}`);
    }
    async getCalculatedAvailability(barbershopId, params) {
        const response = await httpClient.get(`/api/barbershops/${encodeURIComponent(barbershopId)}/availability`, {
            params: {
                date: params.date,
                serviceIds: params.serviceIds.join(','),
                barbermanId: params.barbermanId,
            },
        });
        if (!Array.isArray(response === null || response === void 0 ? void 0 : response.slots))
            return [];
        return response.slots
            .filter((slot) => !!slot && typeof slot.start === 'string' && typeof slot.end === 'string')
            .map((slot) => ({ start: slot.start, end: slot.end }));
    }
}
