import { generateUuidV7 } from '../lib/attempt-id';
import { ServerClock } from '../lib/server-clock';
import { normalizeBookingError, } from '../lib/normalize-booking-error';
import { BookingOperationEngine, } from './booking-operation-engine';
export class BookingFlowEngine {
    constructor(draft, transport, optionsOrTimestamp) {
        var _a, _b, _c;
        this.draft = draft;
        this.transport = transport;
        let resolvedTimeMs = null;
        if (typeof optionsOrTimestamp === 'number') {
            if (optionsOrTimestamp > 0 && !Number.isNaN(optionsOrTimestamp)) {
                resolvedTimeMs = optionsOrTimestamp;
            }
        }
        else if (optionsOrTimestamp instanceof ServerClock) {
            resolvedTimeMs = optionsOrTimestamp.getRequiredNow();
        }
        else if (optionsOrTimestamp && typeof optionsOrTimestamp === 'object') {
            this.store = optionsOrTimestamp.store;
            this.actorId = optionsOrTimestamp.actorId;
            this.scope = (_b = (_a = optionsOrTimestamp.scope) !== null && _a !== void 0 ? _a : draft.scope) !== null && _b !== void 0 ? _b : 'PERSONAL';
            if (optionsOrTimestamp.serverClock) {
                resolvedTimeMs = optionsOrTimestamp.serverClock.getRequiredNow();
            }
            else if (typeof optionsOrTimestamp.serverTimestampMs === 'number' &&
                optionsOrTimestamp.serverTimestampMs > 0 &&
                !Number.isNaN(optionsOrTimestamp.serverTimestampMs)) {
                resolvedTimeMs = optionsOrTimestamp.serverTimestampMs;
            }
        }
        if (!resolvedTimeMs || resolvedTimeMs <= 0) {
            throw new Error('Server clock inválido ou não sincronizado. Impossível gerar chave de tentativa segura.');
        }
        this.timestampMs = resolvedTimeMs;
        this.scope = (_c = draft.scope) !== null && _c !== void 0 ? _c : 'PERSONAL';
        const key = generateUuidV7(this.timestampMs);
        this.attempt = {
            key,
            payload: {
                serviceIds: [...draft.serviceIds],
                barbermanId: draft.barbermanId,
                date: draft.date,
                startTime: draft.startTime,
                expectedTotalPriceInCents: draft.expectedTotalPriceInCents,
                expectedDurationInMinutes: draft.expectedDurationInMinutes,
            },
            status: 'reviewing',
            confirmedBooking: null,
            errorMessage: null,
            quoteMismatch: false,
        };
        this.operationEngine = new BookingOperationEngine({
            store: this.store,
            transport: {
                createBooking: (payload, idempotencyKey) => {
                    return this.transport.createBooking(this.attempt.payload, idempotencyKey);
                },
            },
        });
    }
    get state() {
        return { ...this.attempt };
    }
    get key() {
        return this.attempt.key;
    }
    get status() {
        return this.attempt.status;
    }
    get isSubmitting() {
        return this.attempt.status === 'submitting';
    }
    get isConfirmed() {
        return this.attempt.status === 'confirmed';
    }
    get quoteMismatch() {
        return this.attempt.quoteMismatch;
    }
    get authoritativeQuote() {
        return this.attempt.authoritativeQuote;
    }
    async submit() {
        var _a, _b, _c;
        if (this.attempt.status === 'submitting' || this.attempt.status === 'confirmed') {
            throw new Error('Agendamento já em andamento ou confirmado.');
        }
        const command = {
            action: 'CREATE',
            actorId: (_a = this.actorId) !== null && _a !== void 0 ? _a : 'guest-actor',
            scope: this.scope,
            shopId: this.draft.shopId,
            customerId: this.draft.customerId,
            serviceIds: [...this.draft.serviceIds],
            barbermanId: this.draft.barbermanId,
            date: this.draft.date,
            startTime: this.draft.startTime,
            expectedTotalPriceInCents: this.draft.expectedTotalPriceInCents,
            expectedDurationInMinutes: this.draft.expectedDurationInMinutes,
        };
        const prepared = {
            requestId: this.attempt.key,
            command,
            createdAt: this.timestampMs,
        };
        this.attempt.status = 'submitting';
        this.attempt.errorMessage = null;
        this.attempt.quoteMismatch = false;
        try {
            const result = await this.operationEngine.submit(prepared, {
                store: this.store,
                transport: {
                    createBooking: (payload, idempotencyKey) => {
                        return this.transport.createBooking(this.attempt.payload, idempotencyKey);
                    },
                },
            });
            if (result.state === 'APPLIED' && ((_c = (_b = result.resource) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.booking)) {
                this.attempt.status = 'confirmed';
                this.attempt.confirmedBooking = result.resource.data.booking;
                return result.resource.data.booking;
            }
            throw new Error('Operação concluída sem confirmação autoritativa da reserva.');
        }
        catch (err) {
            this.handleError(err);
            throw err;
        }
    }
    async retryReplay() {
        // Replay conserva rigorosamente a mesma chave e o mesmo payload
        return this.submit();
    }
    handleError(err) {
        var _a;
        const normalized = normalizeBookingError(err);
        if (normalized.code === 'QUOTE_CHANGED') {
            this.attempt.status = 'error';
            this.attempt.quoteMismatch = true;
            this.attempt.authoritativeQuote = (_a = normalized.quote) !== null && _a !== void 0 ? _a : null;
            this.attempt.errorMessage = normalized.message;
            return;
        }
        if (normalized.code === 'NETWORK_OR_TIMEOUT' || normalized.isNetworkError) {
            this.attempt.status = 'uncertain';
            this.attempt.quoteMismatch = false;
            this.attempt.errorMessage = normalized.message;
            return;
        }
        this.attempt.status = 'error';
        this.attempt.quoteMismatch = false;
        this.attempt.errorMessage = normalized.message;
    }
}
