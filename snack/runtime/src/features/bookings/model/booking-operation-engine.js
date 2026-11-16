import { generateUuidV7 } from '../lib/attempt-id';
import { serverClock as defaultServerClock } from '../lib/server-clock';
import { normalizeBookingError } from '../lib/normalize-booking-error';
import { operationAttemptStore as defaultOperationAttemptStore } from '../../../shared/operations/operation-attempt-store';
import { isCurrentActorActive, actorSessionGeneration, awaitOperationCleanup } from '../../../shared/operations/OperationLifecycleBridge';
import { findOwnAttempt, closeOwnAttempt, } from '../../../shared/operations/operation-attempt.api';
import { createBooking, createOperationalBooking, rescheduleBooking, cancelBooking, transitionBookingStatus, } from '../api/bookings.api';
import { getOperationNameForAction, sanitizeCommandForStorage, } from './booking-command.types';
export class BookingOperationEngine {
    assertSession(actorId, generation) {
        if (!isCurrentActorActive(actorId) || generation !== actorSessionGeneration())
            throw new Error('SESSION_CHANGED');
    }
    async saveInSession(store, actorId, generation, record) {
        this.assertSession(actorId, generation);
        await store.save(actorId, record);
        if (!isCurrentActorActive(actorId) || generation !== actorSessionGeneration()) {
            await store.save(actorId, { actorId, requestId: record.requestId, operation: record.operation,
                resourceKind: record.resourceKind, originScope: record.originScope, status: 'uncertain', createdAt: record.createdAt });
            throw new Error('SESSION_CHANGED');
        }
    }
    constructor(options) {
        var _a, _b;
        this.activeSubmissions = new Set();
        this.serverClock = (_a = options === null || options === void 0 ? void 0 : options.serverClock) !== null && _a !== void 0 ? _a : defaultServerClock;
        this.store = (_b = options === null || options === void 0 ? void 0 : options.store) !== null && _b !== void 0 ? _b : defaultOperationAttemptStore;
        this.transport = options === null || options === void 0 ? void 0 : options.transport;
    }
    async prepare(command, overrideOptions) {
        var _a, _b, _c, _d, _e, _f, _g;
        const clock = (_a = overrideOptions === null || overrideOptions === void 0 ? void 0 : overrideOptions.serverClock) !== null && _a !== void 0 ? _a : this.serverClock;
        const store = (_b = overrideOptions === null || overrideOptions === void 0 ? void 0 : overrideOptions.store) !== null && _b !== void 0 ? _b : this.store;
        const generation = actorSessionGeneration();
        await awaitOperationCleanup();
        this.assertSession(command.actorId, generation);
        for (const ref of (_d = await ((_c = store.listReferences) === null || _c === void 0 ? void 0 : _c.call(store, command.actorId))) !== null && _d !== void 0 ? _d : []) {
            if (!['submitting', 'uncertain', 'error'].includes(ref.status))
                continue;
            const saved = await store.read(command.actorId, ref.requestId);
            if (((_e = saved === null || saved === void 0 ? void 0 : saved.result) === null || _e === void 0 ? void 0 : _e.state) === 'NOT_APPLIED' || ((_f = saved === null || saved === void 0 ? void 0 : saved.result) === null || _f === void 0 ? void 0 : _f.state) === 'APPLIED')
                continue;
            throw Object.assign(new Error('Verifique a operação anterior antes de confirmar novamente.'), { requestId: ref.requestId });
        }
        if (!command.actorId || command.actorId.trim() === '') {
            throw new Error('Ator (actorId) é obrigatório para preparar a operação.');
        }
        if (command.action !== 'CREATE') {
            if (!('bookingId' in command) || !command.bookingId || command.bookingId.trim() === '') {
                throw new Error(`bookingId é obrigatório para ação ${command.action}.`);
            }
            if (!('expectedVersion' in command) ||
                command.expectedVersion === undefined ||
                command.expectedVersion === null ||
                typeof command.expectedVersion !== 'number' ||
                command.expectedVersion < 1) {
                throw new Error(`expectedVersion numérico válido (>= 1) é obrigatório para ação ${command.action}.`);
            }
        }
        const timestampMs = clock.getRequiredNow();
        if (!timestampMs || timestampMs <= 0 || Number.isNaN(timestampMs)) {
            throw new Error('Server clock inválido ou não sincronizado. Impossível gerar chave de tentativa segura.');
        }
        const requestId = generateUuidV7(timestampMs);
        const operationName = getOperationNameForAction(command.action);
        // Sanitizar comando para storage: schema versionado, zero PII
        const sanitizedPayload = sanitizeCommandForStorage(command);
        // Persistência inicial da tentativa no store local com status reviewing
        await this.saveInSession(store, command.actorId, generation, {
            actorId: command.actorId,
            requestId,
            operation: operationName,
            resourceKind: 'BOOKING',
            originScope: command.scope,
            status: 'reviewing',
            createdAt: timestampMs,
            payload: sanitizedPayload,
        });
        return {
            requestId,
            command: Object.freeze({ ...command, ...('serviceIds' in command ? { serviceIds: [...((_g = command.serviceIds) !== null && _g !== void 0 ? _g : [])] } : {}) }),
            createdAt: timestampMs,
            sessionGeneration: generation,
        };
    }
    async submit(prepared, overrideOptions) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const store = (_a = overrideOptions === null || overrideOptions === void 0 ? void 0 : overrideOptions.store) !== null && _a !== void 0 ? _a : this.store;
        const clock = (_b = overrideOptions === null || overrideOptions === void 0 ? void 0 : overrideOptions.serverClock) !== null && _b !== void 0 ? _b : this.serverClock;
        const transport = (_c = overrideOptions === null || overrideOptions === void 0 ? void 0 : overrideOptions.transport) !== null && _c !== void 0 ? _c : this.transport;
        const { requestId, command } = prepared;
        const generation = (_d = prepared.sessionGeneration) !== null && _d !== void 0 ? _d : actorSessionGeneration();
        await awaitOperationCleanup();
        this.assertSession(command.actorId, generation);
        if (this.activeSubmissions.has(requestId)) {
            throw new Error('Operação já está em processamento.');
        }
        this.activeSubmissions.add(requestId);
        // 1. Gravar status 'submitting' antes do transporte.
        // Se falhar a persistência aqui, zero requisições são disparadas e nenhum re-save ocorre.
        const sanitizedPayload = sanitizeCommandForStorage(command);
        try {
            await this.saveInSession(store, command.actorId, generation, {
                actorId: command.actorId,
                requestId,
                operation: getOperationNameForAction(command.action),
                resourceKind: 'BOOKING',
                originScope: command.scope,
                status: 'submitting',
                createdAt: prepared.createdAt,
                payload: sanitizedPayload,
            });
        }
        catch (storeError) {
            this.activeSubmissions.delete(requestId);
            throw storeError;
        }
        try {
            // 2. Despacho HTTP pelo contrato canônico com Idempotency-Key
            this.assertSession(command.actorId, generation);
            let apiResult;
            switch (command.action) {
                case 'CREATE': {
                    if (command.scope === 'UNIT' && command.customerId) {
                        const caller = (_e = transport === null || transport === void 0 ? void 0 : transport.createOperationalBooking) !== null && _e !== void 0 ? _e : createOperationalBooking;
                        apiResult = await caller(command.shopId, {
                            customerId: command.customerId,
                            serviceIds: command.serviceIds,
                            barbermanId: command.barbermanId,
                            date: command.date,
                            startTime: command.startTime,
                            slotStartAt: command.slotStartAt,
                            expectedTotalPriceInCents: command.expectedTotalPriceInCents,
                            expectedDurationInMinutes: command.expectedDurationInMinutes,
                        }, requestId);
                    }
                    else {
                        const caller = (_f = transport === null || transport === void 0 ? void 0 : transport.createBooking) !== null && _f !== void 0 ? _f : createBooking;
                        apiResult = await caller({
                            shopId: command.shopId,
                            customerId: command.customerId,
                            serviceIds: command.serviceIds,
                            barbermanId: command.barbermanId,
                            date: command.date,
                            startTime: command.startTime,
                            slotStartAt: command.slotStartAt,
                            expectedTotalPriceInCents: command.expectedTotalPriceInCents,
                            expectedDurationInMinutes: command.expectedDurationInMinutes,
                            scope: command.scope,
                        }, requestId);
                    }
                    break;
                }
                case 'RESCHEDULE': {
                    const caller = (_g = transport === null || transport === void 0 ? void 0 : transport.rescheduleBooking) !== null && _g !== void 0 ? _g : rescheduleBooking;
                    apiResult = await caller(command.bookingId, {
                        expectedVersion: command.expectedVersion,
                        date: command.date,
                        startTime: command.startTime,
                        slotStartAt: command.slotStartAt,
                        barbermanId: command.barbermanId,
                        serviceIds: command.serviceIds,
                        expectedTotalPriceInCents: command.expectedTotalPriceInCents,
                        expectedDurationInMinutes: command.expectedDurationInMinutes,
                        scope: command.scope,
                        reason: command.reason,
                    }, requestId);
                    break;
                }
                case 'CANCEL': {
                    const caller = (_h = transport === null || transport === void 0 ? void 0 : transport.cancelBooking) !== null && _h !== void 0 ? _h : cancelBooking;
                    apiResult = await caller(command.bookingId, {
                        expectedVersion: command.expectedVersion,
                        reason: command.reason,
                        scope: command.scope,
                    }, requestId);
                    break;
                }
                case 'COMPLETE': {
                    const caller = (_j = transport === null || transport === void 0 ? void 0 : transport.transitionBookingStatus) !== null && _j !== void 0 ? _j : transitionBookingStatus;
                    apiResult = await caller(command.bookingId, {
                        status: 'COMPLETED',
                        expectedVersion: command.expectedVersion,
                        reason: command.reason,
                    }, requestId);
                    break;
                }
                case 'NO_SHOW': {
                    const caller = (_k = transport === null || transport === void 0 ? void 0 : transport.transitionBookingStatus) !== null && _k !== void 0 ? _k : transitionBookingStatus;
                    apiResult = await caller(command.bookingId, {
                        status: 'NO_SHOW',
                        expectedVersion: command.expectedVersion,
                        reason: command.reason,
                    }, requestId);
                    break;
                }
            }
            this.assertSession(command.actorId, generation);
            // Sincronizar relógio com autoridade retornada
            if (apiResult.serverTime) {
                try {
                    clock.syncWithServer(apiResult.serverTime);
                }
                catch {
                    // ignore
                }
            }
            const operationResult = {
                state: 'APPLIED',
                operation: getOperationNameForAction(command.action),
                resource: {
                    kind: 'BOOKING',
                    id: apiResult.booking.id,
                    version: apiResult.booking.version,
                    data: {
                        booking: apiResult.booking,
                        serverTime: apiResult.serverTime,
                    },
                },
                accessChanged: false,
                serverTime: apiResult.serverTime,
            };
            // 3. Atualizar store como confirmed com resultado durável
            try {
                await this.saveInSession(store, command.actorId, generation, {
                    actorId: command.actorId,
                    requestId,
                    operation: getOperationNameForAction(command.action),
                    resourceKind: 'BOOKING',
                    originScope: command.scope,
                    status: 'confirmed',
                    createdAt: prepared.createdAt,
                    payload: sanitizedPayload,
                    result: operationResult,
                });
            }
            catch {
                // Falha no save após APPLIED não invalida o fato consumado no servidor
            }
            this.assertSession(command.actorId, generation);
            this.assertSession(command.actorId, generation);
            return operationResult;
        }
        catch (err) {
            // Session cleanup already retained the opaque reference; never resurrect its payload.
            if (!isCurrentActorActive(command.actorId) || generation !== actorSessionGeneration())
                throw new Error('SESSION_CHANGED');
            if (err && typeof err === 'object')
                err.requestId = requestId;
            const normalized = normalizeBookingError(err);
            if (normalized.code === 'QUOTE_CHANGED') {
                try {
                    await this.saveInSession(store, command.actorId, generation, {
                        actorId: command.actorId,
                        requestId,
                        operation: getOperationNameForAction(command.action),
                        resourceKind: 'BOOKING',
                        originScope: command.scope,
                        status: 'error',
                        createdAt: prepared.createdAt,
                        errorMessage: normalized.message,
                    });
                }
                catch {
                    // ignore
                }
                throw err;
            }
            if (normalized.code === 'NETWORK_OR_TIMEOUT' || normalized.isNetworkError || !(err === null || err === void 0 ? void 0 : err.status) || err.status >= 500) {
                // Erro de transporte / timeout / resposta perdida: marcar como uncertain
                try {
                    const sanitizedPayload = sanitizeCommandForStorage(command);
                    await this.saveInSession(store, command.actorId, generation, {
                        actorId: command.actorId,
                        requestId,
                        operation: getOperationNameForAction(command.action),
                        resourceKind: 'BOOKING',
                        originScope: command.scope,
                        status: 'uncertain',
                        createdAt: prepared.createdAt,
                        payload: sanitizedPayload,
                        errorMessage: normalized.message,
                    });
                }
                catch {
                    // ignore
                }
                throw err;
            }
            // Demais erros HTTP terminais (400, 403, 404, 409 slot unavailable)
            try {
                await this.saveInSession(store, command.actorId, generation, {
                    actorId: command.actorId,
                    requestId,
                    operation: getOperationNameForAction(command.action),
                    resourceKind: 'BOOKING',
                    originScope: command.scope,
                    status: 'error',
                    createdAt: prepared.createdAt,
                    errorMessage: normalized.message,
                });
            }
            catch {
                // ignore
            }
            throw err;
        }
        finally {
            this.activeSubmissions.delete(requestId);
        }
    }
    async reconcile(actorId, requestId, overrideOptions) {
        var _a, _b, _c, _d, _e;
        const store = (_a = overrideOptions === null || overrideOptions === void 0 ? void 0 : overrideOptions.store) !== null && _a !== void 0 ? _a : this.store;
        const generation = actorSessionGeneration();
        await awaitOperationCleanup();
        this.assertSession(actorId, generation);
        const rawResult = await findOwnAttempt(requestId);
        this.assertSession(actorId, generation);
        const operationResult = {
            state: rawResult.state,
            operation: rawResult.operation,
            resource: rawResult.resource
                ? {
                    kind: (_b = rawResult.resource.kind) !== null && _b !== void 0 ? _b : 'BOOKING',
                    id: rawResult.resource.id,
                    version: rawResult.resource.version,
                    data: rawResult.resource.data,
                }
                : undefined,
            accessChanged: (_c = rawResult.accessChanged) !== null && _c !== void 0 ? _c : false,
            serverTime: rawResult.serverTime,
        };
        const existing = await store.read(actorId, requestId);
        const existingScope = (existing === null || existing === void 0 ? void 0 : existing.originScope) === 'UNIT' || (existing === null || existing === void 0 ? void 0 : existing.originScope) === 'PERSONAL' ? existing.originScope : undefined;
        operationResult.originScope = existingScope;
        if (rawResult.state === 'APPLIED') {
            try {
                await this.saveInSession(store, actorId, generation, {
                    actorId,
                    requestId,
                    operation: (_d = rawResult.operation) !== null && _d !== void 0 ? _d : 'BOOKING_OPERATION',
                    resourceKind: 'BOOKING',
                    originScope: existingScope,
                    status: 'confirmed',
                    createdAt: Date.now(),
                    result: operationResult,
                });
            }
            catch {
                // ignore
            }
        }
        else if (rawResult.state === 'NOT_APPLIED') {
            try {
                await this.saveInSession(store, actorId, generation, {
                    actorId,
                    requestId,
                    operation: (_e = rawResult.operation) !== null && _e !== void 0 ? _e : 'BOOKING_OPERATION',
                    resourceKind: 'BOOKING',
                    originScope: existingScope,
                    status: 'error',
                    createdAt: Date.now(),
                    result: operationResult,
                });
            }
            catch {
                // ignore
            }
        }
        this.assertSession(actorId, generation);
        return operationResult;
    }
    async close(actorId, requestId, overrideOptions) {
        var _a, _b, _c, _d;
        const store = (_a = overrideOptions === null || overrideOptions === void 0 ? void 0 : overrideOptions.store) !== null && _a !== void 0 ? _a : this.store;
        const generation = actorSessionGeneration();
        await awaitOperationCleanup();
        this.assertSession(actorId, generation);
        const rawResult = await closeOwnAttempt(requestId);
        this.assertSession(actorId, generation);
        const operationResult = {
            state: rawResult.state,
            operation: rawResult.operation,
            resource: rawResult.resource
                ? {
                    kind: (_b = rawResult.resource.kind) !== null && _b !== void 0 ? _b : 'BOOKING',
                    id: rawResult.resource.id,
                    version: rawResult.resource.version,
                    data: rawResult.resource.data,
                }
                : undefined,
            accessChanged: (_c = rawResult.accessChanged) !== null && _c !== void 0 ? _c : false,
            serverTime: rawResult.serverTime,
        };
        const existing = await store.read(actorId, requestId);
        const existingScope = (existing === null || existing === void 0 ? void 0 : existing.originScope) === 'UNIT' || (existing === null || existing === void 0 ? void 0 : existing.originScope) === 'PERSONAL' ? existing.originScope : undefined;
        operationResult.originScope = existingScope;
        if (rawResult.state === 'NOT_APPLIED' || rawResult.state === 'APPLIED') {
            try {
                await this.saveInSession(store, actorId, generation, {
                    actorId,
                    requestId,
                    operation: (_d = rawResult.operation) !== null && _d !== void 0 ? _d : 'BOOKING_OPERATION',
                    resourceKind: 'BOOKING',
                    originScope: existingScope,
                    status: rawResult.state === 'APPLIED' ? 'confirmed' : 'error',
                    createdAt: Date.now(),
                    result: operationResult,
                });
            }
            catch {
                // ignore
            }
        }
        this.assertSession(actorId, generation);
        return operationResult;
    }
}
export const bookingOperationEngine = new BookingOperationEngine();
