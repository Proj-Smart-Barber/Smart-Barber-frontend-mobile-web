import { generateUuidV7 } from '../../bookings/lib/attempt-id';
import { serverClock as defaultServerClock } from '../../bookings/lib/server-clock';
import { operationAttemptStore as defaultStore } from '../../../shared/operations/operation-attempt-store';
import { actorSessionGeneration, awaitOperationCleanup, isCurrentActorActive } from '../../../shared/operations/OperationLifecycleBridge';
import { closeOwnAttempt, findOwnAttempt } from '../../../shared/operations/operation-attempt.api';
import { parseScheduleScopeDocument } from '../api/availability.http';
import { normalizeBarberScheduleError } from '../api/barber-schedule-error';
export const SCHEDULE_OPERATION = 'UPDATE_SCHEDULE';
const UNRESOLVED = ['submitting', 'uncertain', 'error'];
const inFlight = new Set();
export function buildScheduleResourceId(shopId, barbermanId) {
    return barbermanId ? `${shopId}:${barbermanId}` : shopId;
}
export function matchesScheduleScope(resourceId, shopId, barbermanId) {
    if (!resourceId || !shopId)
        return false;
    const expected = buildScheduleResourceId(shopId, barbermanId);
    return resourceId === expected;
}
function referenceOf(actorId, requestId, createdAt, status, extra = {}) {
    return { actorId, requestId, operation: SCHEDULE_OPERATION, resourceKind: 'SCHEDULE',
        originScope: 'UNIT', status, createdAt, ...extra };
}
/** Mesmo ledger das reservas: o ator/geração da sessão decide se uma resposta ainda vale. */
function sessionIsCurrent(actorId, generation) {
    return isCurrentActorActive(actorId) && generation === actorSessionGeneration();
}
function syncClock(clock, serverTime) {
    if (!serverTime)
        return;
    try {
        clock.syncWithServer(serverTime);
    }
    catch { /* relógio inválido não invalida a resposta */ }
}
async function hasUnresolvedReference(store, actorId, shopId, barbermanId) {
    var _a, _b, _c, _d, _e, _f;
    for (const ref of await store.listReferences(actorId)) {
        if (ref.resourceKind !== 'SCHEDULE' || !UNRESOLVED.includes(ref.status))
            continue;
        if (ref.resourceId && !matchesScheduleScope(ref.resourceId, shopId, barbermanId))
            continue;
        const saved = await store.read(actorId, ref.requestId);
        if (((_a = saved === null || saved === void 0 ? void 0 : saved.result) === null || _a === void 0 ? void 0 : _a.state) === 'NOT_APPLIED' || ((_b = saved === null || saved === void 0 ? void 0 : saved.result) === null || _b === void 0 ? void 0 : _b.state) === 'APPLIED')
            continue;
        const savedResourceId = (_f = (_c = saved === null || saved === void 0 ? void 0 : saved.resourceId) !== null && _c !== void 0 ? _c : (_e = (_d = saved === null || saved === void 0 ? void 0 : saved.result) === null || _d === void 0 ? void 0 : _d.resource) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : ref.resourceId;
        if (savedResourceId && !matchesScheduleScope(savedResourceId, shopId, barbermanId))
            continue;
        return ref.requestId;
    }
    return null;
}
export async function saveSchedule(repository, command, deps = {}) {
    var _a, _b, _c;
    const store = (_a = deps.store) !== null && _a !== void 0 ? _a : defaultStore;
    const clock = (_b = deps.clock) !== null && _b !== void 0 ? _b : defaultServerClock;
    const { actorId, shopId, ...input } = command;
    if (!actorId || !shopId)
        throw new Error('Ator e unidade são obrigatórios.');
    const resourceId = buildScheduleResourceId(shopId, input.barbermanId);
    const scopeId = JSON.stringify([actorId, shopId, input.barbermanId]);
    if (inFlight.has(scopeId))
        return { kind: 'blocked', reason: 'BUSY' };
    inFlight.add(scopeId);
    try {
        const generation = actorSessionGeneration();
        await awaitOperationCleanup();
        if (!sessionIsCurrent(actorId, generation))
            return { kind: 'session-changed' };
        const unresolved = await hasUnresolvedReference(store, actorId, shopId, input.barbermanId);
        if (!sessionIsCurrent(actorId, generation))
            return { kind: 'session-changed' };
        if (unresolved)
            return { kind: 'blocked', reason: 'PENDING_ATTEMPT', requestId: unresolved };
        let createdAt;
        try {
            createdAt = clock.getRequiredNow();
        }
        catch {
            return { kind: 'blocked', reason: 'CLOCK_UNAVAILABLE' };
        }
        const requestId = generateUuidV7(createdAt);
        // A referência precisa existir antes da mutação; sem ela a operação seria irrecuperável.
        try {
            await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'submitting', { resourceId }));
        }
        catch {
            return { kind: 'blocked', reason: 'STORAGE_UNAVAILABLE', requestId };
        }
        if (!sessionIsCurrent(actorId, generation) || (deps.isContextActive && !deps.isContextActive())) {
            return { kind: 'session-changed', requestId };
        }
        try {
            const document = await repository.saveScheduleScope(shopId, { ...input, requestId });
            if (!sessionIsCurrent(actorId, generation) || (deps.isContextActive && !deps.isContextActive())) {
                return { kind: 'session-changed', requestId };
            }
            syncClock(clock, document.serverTime);
            await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'confirmed', {
                resourceId,
                result: { state: 'APPLIED', operation: SCHEDULE_OPERATION, accessChanged: false,
                    serverTime: (_c = document.serverTime) !== null && _c !== void 0 ? _c : undefined,
                    resource: { kind: 'SCHEDULE', id: resourceId, version: document.version } },
            })).catch(() => undefined); // O fato já ocorreu no servidor.
            return { kind: 'saved', requestId, document };
        }
        catch (cause) {
            if (!sessionIsCurrent(actorId, generation) || (deps.isContextActive && !deps.isContextActive())) {
                return { kind: 'session-changed', requestId };
            }
            const error = normalizeBarberScheduleError(cause, true);
            if (error.writeState === 'unknown') {
                await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'uncertain', { resourceId, errorMessage: error.message })).catch(() => undefined);
                return { kind: 'unknown', requestId, error };
            }
            // Rejeição HTTP terminal: a transação do servidor foi revertida, nada ficou pendente.
            await store.save(actorId, referenceOf(actorId, requestId, createdAt, 'error', {
                resourceId,
                errorMessage: error.message, result: { state: 'NOT_APPLIED', operation: SCHEDULE_OPERATION },
            })).catch(() => undefined);
            const revoked = error.status === 401 || error.status === 403 || error.status === 404;
            return { kind: revoked ? 'access-revoked' : 'rejected', requestId, error };
        }
    }
    finally {
        inFlight.delete(scopeId);
    }
}
function hasForeignShopEntries(data, shopId) {
    var _a;
    if (!data || typeof data !== 'object')
        return false;
    const raw = data;
    for (const list of [raw.schedules, raw.effectiveSchedules]) {
        if (!Array.isArray(list))
            continue;
        for (const item of list) {
            if (item && typeof item === 'object') {
                const entryShop = (_a = item.barbershopId) !== null && _a !== void 0 ? _a : item.barbershop_id;
                if (typeof entryShop === 'string' && entryShop.length > 0 && entryShop !== shopId) {
                    return true;
                }
            }
        }
    }
    return false;
}
function hasMismatchedPersonalEntries(data, barbermanId) {
    var _a;
    if (!barbermanId || !data || typeof data !== 'object')
        return false;
    const raw = data;
    if (!Array.isArray(raw.schedules))
        return false;
    for (const item of raw.schedules) {
        if (item && typeof item === 'object') {
            const entryBarber = (_a = item.barbermanId) !== null && _a !== void 0 ? _a : item.barberman_id;
            if (entryBarber !== barbermanId) {
                return true;
            }
        }
    }
    return false;
}
function toReconcile(requestId, result, barbermanId, shopId) {
    var _a, _b;
    if (result.state === 'APPLIED') {
        if (result.accessChanged)
            return { kind: 'access-revoked', requestId };
        if (result.operation && result.operation !== SCHEDULE_OPERATION) {
            return { kind: 'unknown', requestId };
        }
        if (!((_a = result.resource) === null || _a === void 0 ? void 0 : _a.kind) || result.resource.kind !== 'SCHEDULE') {
            return { kind: 'unknown', requestId };
        }
        if (!((_b = result.resource) === null || _b === void 0 ? void 0 : _b.id)) {
            return { kind: 'unknown', requestId };
        }
        if (shopId) {
            if (!matchesScheduleScope(result.resource.id, shopId, barbermanId)) {
                return { kind: 'unknown', requestId };
            }
            if (hasForeignShopEntries(result.resource.data, shopId)) {
                return { kind: 'unknown', requestId };
            }
            if (hasMismatchedPersonalEntries(result.resource.data, barbermanId)) {
                return { kind: 'unknown', requestId };
            }
        }
        let document = null;
        try {
            document = parseScheduleScopeDocument(result.resource.data, barbermanId);
        }
        catch {
            document = null;
        }
        return { kind: 'applied', requestId, document };
    }
    if (result.state === 'NOT_APPLIED')
        return { kind: 'not-applied', requestId };
    if (result.state === 'PENDING')
        return { kind: 'pending', requestId };
    return { kind: 'unknown', requestId };
}
async function settle(actorId, requestId, barbermanId, load, deps, shopId) {
    var _a, _b, _c, _d, _e, _f, _g;
    const store = (_a = deps.store) !== null && _a !== void 0 ? _a : defaultStore;
    const clock = (_b = deps.clock) !== null && _b !== void 0 ? _b : defaultServerClock;
    const generation = actorSessionGeneration();
    await awaitOperationCleanup();
    if (!sessionIsCurrent(actorId, generation))
        return { kind: 'session-changed', requestId };
    let result;
    try {
        result = await load();
    }
    catch {
        return { kind: 'unknown', requestId };
    }
    if (!sessionIsCurrent(actorId, generation))
        return { kind: 'session-changed', requestId };
    syncClock(clock, result.serverTime);
    const outcome = toReconcile(requestId, result, barbermanId, shopId);
    const existing = await store.read(actorId, requestId).catch(() => null);
    const resolvedResourceId = (_e = (_d = (_c = result.resource) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : existing === null || existing === void 0 ? void 0 : existing.resourceId) !== null && _e !== void 0 ? _e : (shopId ? buildScheduleResourceId(shopId, barbermanId) : null);
    const base = referenceOf(actorId, requestId, (_f = existing === null || existing === void 0 ? void 0 : existing.createdAt) !== null && _f !== void 0 ? _f : Date.now(), 'uncertain', {
        resourceId: resolvedResourceId,
    });
    const normalized = { state: result.state, operation: result.operation,
        accessChanged: (_g = result.accessChanged) !== null && _g !== void 0 ? _g : false, serverTime: result.serverTime,
        resource: result.resource ? { kind: result.resource.kind, id: result.resource.id, version: result.resource.version } : undefined };
    if (result.state === 'APPLIED')
        await store.save(actorId, { ...base, status: 'confirmed', result: normalized }).catch(() => undefined);
    if (result.state === 'NOT_APPLIED')
        await store.save(actorId, { ...base, status: 'error', result: normalized }).catch(() => undefined);
    return outcome;
}
/** Consulta o contrato real (`GET /operation-attempts/:requestId`); um GET da jornada não prova fechamento. */
export function reconcileSchedule(actorId, requestId, barbermanId, deps = {}, shopId) {
    return settle(actorId, requestId, barbermanId, () => { var _a; return ((_a = deps.findAttempt) !== null && _a !== void 0 ? _a : findOwnAttempt)(requestId); }, deps, shopId);
}
/** Encerra a tentativa no servidor: depois de NOT_APPLIED uma chave tardia não pode mais aplicar a escrita. */
export function closeScheduleAttempt(actorId, requestId, barbermanId, deps = {}, shopId) {
    return settle(actorId, requestId, barbermanId, () => { var _a; return ((_a = deps.closeAttempt) !== null && _a !== void 0 ? _a : closeOwnAttempt)(requestId); }, deps, shopId);
}
