import { ApiError } from '../../../shared/api';
import { ENV } from '../../../shared/config/env';
import { mapBarbershopDto, mapWeeklyScheduleList, mapExceptionList, mapSlotList, } from './availability.mapper';
/** Seed fixo até barbershopId existir de verdade na sessão (Issue empresa pendente na main). */
export const SEED_BARBERSHOP_ID = ENV.BARBERSHOP_ID;
const MOCK_BARBERSHOP_RAW = {
    id: SEED_BARBERSHOP_ID,
    name: 'Barbearia Exemplo',
    timezone: 'America/Sao_Paulo',
};
// Jornada inicial: seg-sex com pausa para almoço (dois ranges por dia),
// sábado corrido — confirmado no protótipo Stitch "Jornada e Horários".
const INITIAL_SCHEDULE_RAW = [
    { id: 'sch-001', day_of_week: 'MONDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
    { id: 'sch-002', day_of_week: 'MONDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
    { id: 'sch-003', day_of_week: 'TUESDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
    { id: 'sch-004', day_of_week: 'TUESDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
    { id: 'sch-005', day_of_week: 'WEDNESDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
    { id: 'sch-006', day_of_week: 'WEDNESDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
    { id: 'sch-007', day_of_week: 'THURSDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
    { id: 'sch-008', day_of_week: 'THURSDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
    { id: 'sch-009', day_of_week: 'FRIDAY', barberman_id: null, open_time: '08:00', close_time: '12:00' },
    { id: 'sch-010', day_of_week: 'FRIDAY', barberman_id: null, open_time: '13:00', close_time: '18:00' },
    { id: 'sch-011', day_of_week: 'SATURDAY', barberman_id: null, open_time: '09:00', close_time: '14:00' },
    // SUNDAY ausente = fechado
];
const INITIAL_EXCEPTIONS_RAW = [
    {
        id: 'exc-001',
        date: '2026-12-25',
        barberman_id: null,
        open_time: null,
        close_time: null,
        reason: 'Natal',
    },
];
let nextScheduleSeq = INITIAL_SCHEDULE_RAW.length + 1;
let nextExceptionSeq = INITIAL_EXCEPTIONS_RAW.length + 1;
export class AvailabilityMockAdapter {
    constructor(latencyMs = 350) {
        this.schedules = new Map();
        this.failures = new Map();
        this.exceptionsRaw = [...INITIAL_EXCEPTIONS_RAW];
        this.scopeMeta = new Map();
        this.appliedRequests = new Map();
        this.latencyMs = latencyMs;
    }
    /** One-shot, scoped fixtures for tests/dev; does not simulate authentication. */
    failNextSchedule(operation, shopId, barbermanId, error) {
        this.failures.set(JSON.stringify([operation, shopId, barbermanId]), error);
    }
    takeFailure(operation, shopId, barbermanId) {
        const key = JSON.stringify([operation, shopId, barbermanId]);
        const error = this.failures.get(key);
        this.failures.delete(key);
        return error;
    }
    scheduleFor(shopId) {
        if (!this.schedules.has(shopId)) {
            this.schedules.set(shopId, INITIAL_SCHEDULE_RAW.map(entry => ({ ...entry })));
        }
        return this.schedules.get(shopId);
    }
    delay() {
        return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
    async getBarbershop(barbershopId) {
        await this.delay();
        const mapped = mapBarbershopDto({ ...MOCK_BARBERSHOP_RAW, id: barbershopId });
        if (!mapped)
            throw new Error(`Barbearia ${barbershopId} inválida no mock.`);
        return mapped;
    }
    scopeKey(shopId, barbermanId) {
        return JSON.stringify([shopId, barbermanId]);
    }
    buildScopeDocument(shopId, barbermanId) {
        var _a, _b, _c;
        const rows = this.scheduleFor(shopId);
        const general = rows.filter((entry) => entry.barberman_id === null);
        const own = barbermanId ? rows.filter((entry) => entry.barberman_id === barbermanId) : general;
        const generalState = (_a = this.scopeMeta.get(this.scopeKey(shopId, null))) === null || _a === void 0 ? void 0 : _a.state;
        const meta = this.scopeMeta.get(this.scopeKey(shopId, barbermanId));
        // Espelha o servidor: legado sem escopo e sem períodos próprios fecha e exige revisão.
        const legacyReview = Boolean(barbermanId) && !meta && own.length === 0;
        const state = (_b = meta === null || meta === void 0 ? void 0 : meta.state) !== null && _b !== void 0 ? _b : (barbermanId ? (own.length > 0 ? 'CUSTOM' : 'CLOSED') : (general.length > 0 ? 'CUSTOM' : 'CLOSED'));
        const generalClosed = generalState === 'CLOSED' || general.length === 0;
        const schedules = state === 'CUSTOM' ? own : [];
        const effective = state === 'CLOSED' ? [] : state === 'INHERIT' ? (generalClosed ? [] : general) : own;
        return {
            barbermanId,
            schedules: mapWeeklyScheduleList(schedules),
            effectiveSchedules: mapWeeklyScheduleList(effective),
            state,
            version: (_c = meta === null || meta === void 0 ? void 0 : meta.version) !== null && _c !== void 0 ? _c : 1,
            needsReview: legacyReview,
            serverTime: new Date().toISOString(),
        };
    }
    async getScheduleScope(barbershopId, barbermanId) {
        await this.delay();
        const failure = this.takeFailure('read', barbershopId, barbermanId);
        if (failure)
            throw failure;
        return this.buildScopeDocument(barbershopId, barbermanId !== null && barbermanId !== void 0 ? barbermanId : null);
    }
    async saveScheduleScope(barbershopId, input) {
        var _a, _b, _c;
        await this.delay();
        const replay = this.appliedRequests.get(JSON.stringify([barbershopId, input.requestId]));
        if (replay)
            return replay;
        const failure = this.takeFailure('write', barbershopId, (_a = input.barbermanId) !== null && _a !== void 0 ? _a : undefined);
        if (failure && failure.writeState === 'rejected')
            throw failure;
        const key = this.scopeKey(barbershopId, input.barbermanId);
        const current = (_c = (_b = this.scopeMeta.get(key)) === null || _b === void 0 ? void 0 : _b.version) !== null && _c !== void 0 ? _c : 1;
        if (input.expectedVersion !== current) {
            const code = 'SCHEDULE_VERSION_CONFLICT';
            throw new ApiError('A versão da jornada mudou. Recarregue os dados.', 409, { code, message: 'A versão da jornada mudou.', error: { code, message: 'A versão da jornada mudou.' } });
        }
        const untouched = this.scheduleFor(barbershopId).filter((e) => e.barberman_id !== input.barbermanId);
        const savedRaw = input.state === 'CUSTOM'
            ? input.entries.map((entry) => ({
                id: `sch-${nextScheduleSeq++}`,
                day_of_week: entry.weekday,
                barberman_id: input.barbermanId,
                open_time: entry.range.start,
                close_time: entry.range.end,
            }))
            : [];
        this.schedules.set(barbershopId, [...untouched, ...savedRaw]);
        this.scopeMeta.set(key, { state: input.state, version: current + 1 });
        const document = this.buildScopeDocument(barbershopId, input.barbermanId);
        this.appliedRequests.set(JSON.stringify([barbershopId, input.requestId]), document);
        // 'unknown' modela escrita confirmada antes de a conexão expirar.
        if (failure)
            throw new ApiError('A requisição excedeu o tempo limite (timeout).', 0, null, true);
        return document;
    }
    async getWeeklySchedule(barbershopId, barbermanId) {
        await this.delay();
        const failure = this.takeFailure('read', barbershopId, barbermanId);
        if (failure)
            throw failure;
        const filtered = this.scheduleFor(barbershopId).filter((entry) => barbermanId ? entry.barberman_id === barbermanId : entry.barberman_id === null);
        return mapWeeklyScheduleList(filtered);
    }
    async saveWeeklySchedule(barbershopId, entries, scopeBarbermanId) {
        var _a, _b;
        await this.delay();
        const barbermanId = (_b = scopeBarbermanId !== null && scopeBarbermanId !== void 0 ? scopeBarbermanId : (_a = entries[0]) === null || _a === void 0 ? void 0 : _a.barbermanId) !== null && _b !== void 0 ? _b : null;
        const failure = this.takeFailure('write', barbershopId, scopeBarbermanId);
        if (failure && failure.writeState === 'rejected')
            throw failure;
        // Substitui só as linhas do mesmo "dono" (loja geral ou profissional específico)
        const untouched = this.scheduleFor(barbershopId).filter((e) => e.barberman_id !== barbermanId);
        const savedRaw = entries.map((entry) => ({
            id: `sch-${nextScheduleSeq++}`,
            day_of_week: entry.weekday,
            barberman_id: barbermanId,
            open_time: entry.range.start,
            close_time: entry.range.end,
        }));
        this.schedules.set(barbershopId, [...untouched, ...savedRaw]);
        // 'unknown' models a write committed before the connection timed out.
        if (failure)
            throw failure;
        return mapWeeklyScheduleList(savedRaw);
    }
    async listExceptions(_barbershopId, barbermanId) {
        await this.delay();
        const filtered = this.exceptionsRaw.filter((e) => barbermanId ? e.barberman_id === barbermanId : e.barberman_id === null);
        return mapExceptionList(filtered);
    }
    async createException(_barbershopId, exception) {
        await this.delay();
        const raw = {
            id: `exc-${nextExceptionSeq++}`,
            date: exception.date,
            barberman_id: exception.barbermanId,
            open_time: exception.openTime,
            close_time: exception.closeTime,
            reason: exception.reason,
        };
        this.exceptionsRaw = [...this.exceptionsRaw, raw];
        const mapped = mapExceptionList([raw]);
        return mapped[0];
    }
    async updateException(_barbershopId, exceptionId, exception) {
        await this.delay();
        const index = this.exceptionsRaw.findIndex((e) => e.id === exceptionId);
        if (index === -1)
            throw new Error(`Exceção ${exceptionId} não encontrada.`);
        const current = this.exceptionsRaw[index];
        const updated = {
            ...current,
            ...(exception.date !== undefined && { date: exception.date }),
            ...(exception.barbermanId !== undefined && { barberman_id: exception.barbermanId }),
            ...(exception.openTime !== undefined && { open_time: exception.openTime }),
            ...(exception.closeTime !== undefined && { close_time: exception.closeTime }),
            ...(exception.reason !== undefined && { reason: exception.reason }),
        };
        this.exceptionsRaw[index] = updated;
        return mapExceptionList([updated])[0];
    }
    async removeException(_barbershopId, exceptionId) {
        await this.delay();
        this.exceptionsRaw = this.exceptionsRaw.filter((e) => e.id !== exceptionId);
    }
    async getCalculatedAvailability(_barbershopId, params) {
        await this.delay();
        // Mock simplificado: gera slots de 30 min dentro do período da manhã.
        // Não reflete a regra real (jornada + exceção + duração + bookings).
        // Substituir pelo AgendaHttpAdapter quando o endpoint real existir.
        const slots = mapSlotList([
            { start: `${params.date}T09:00:00-03:00`, end: `${params.date}T09:30:00-03:00` },
            { start: `${params.date}T09:30:00-03:00`, end: `${params.date}T10:00:00-03:00` },
            { start: `${params.date}T10:00:00-03:00`, end: `${params.date}T10:30:00-03:00` },
        ]);
        return slots;
    }
}
