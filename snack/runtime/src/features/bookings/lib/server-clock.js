/**
 * ServerClock: Combina uma referência autoritativa de serverTime com o tempo decorrido monotônico.
 * Impede o uso do relógio de parede não confiável do aparelho para gerar novas tentativas.
 */
export const DEFAULT_SERVER_CLOCK_LEASE_MS = 5 * 60 * 1000; // 5 minutos
export class ServerClock {
    constructor(getMonotonicTimeMs = () => {
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            return performance.now();
        }
        throw new Error('Fonte monotônica de tempo indisponível no ambiente.');
    }, maxLeaseMs = DEFAULT_SERVER_CLOCK_LEASE_MS) {
        this.getMonotonicTimeMs = getMonotonicTimeMs;
        this.serverReferenceMs = null;
        this.monotonicOriginMs = null;
        this.generation = 0;
        this.maxLeaseMs = maxLeaseMs;
    }
    getGeneration() {
        return this.generation;
    }
    syncWithServer(serverTime, options) {
        var _a;
        // Rejeita amostras pertencentes a uma geração/sessão anterior após clear
        if ((options === null || options === void 0 ? void 0 : options.expectedGeneration) !== undefined && options.expectedGeneration !== this.generation) {
            return false;
        }
        let parsedMs;
        if (serverTime instanceof Date) {
            parsedMs = serverTime.getTime();
        }
        else if (typeof serverTime === 'number') {
            parsedMs = serverTime;
        }
        else if (typeof serverTime === 'string') {
            const parsed = Date.parse(serverTime);
            if (Number.isNaN(parsed)) {
                throw new Error('serverTime inválido fornecido para sincronização.');
            }
            parsedMs = parsed;
        }
        else {
            throw new Error('serverTime inválido fornecido para sincronização.');
        }
        if (Number.isNaN(parsedMs) || parsedMs <= 0) {
            throw new Error('serverTime inválido fornecido para sincronização.');
        }
        try {
            const origin = typeof (options === null || options === void 0 ? void 0 : options.sampleMonotonicMs) === 'number'
                ? options.sampleMonotonicMs
                : this.getMonotonicTimeMs();
            if (typeof origin !== 'number' || Number.isNaN(origin)) {
                throw new Error('Tempo monotônico inválido.');
            }
            // Rejeita amostras atrasadas/fora de ordem se já houver referência monotônica mais recente
            if (!(options === null || options === void 0 ? void 0 : options.force) && this.monotonicOriginMs !== null && origin < this.monotonicOriginMs) {
                return false;
            }
            this.serverReferenceMs = Math.floor(parsedMs);
            this.monotonicOriginMs = origin;
            return true;
        }
        catch (err) {
            if ((err === null || err === void 0 ? void 0 : err.message) === 'Tempo monotônico inválido.')
                throw err;
            if ((_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.includes('serverTime inválido'))
                throw err;
            this.serverReferenceMs = null;
            this.monotonicOriginMs = null;
            throw new Error('Fonte monotônica de tempo indisponível para sincronização.');
        }
    }
    hasValidReference() {
        if (this.serverReferenceMs === null || this.monotonicOriginMs === null) {
            return false;
        }
        const elapsed = this.getMonotonicTimeMs() - this.monotonicOriginMs;
        return elapsed >= 0 && elapsed <= this.maxLeaseMs;
    }
    now() {
        if (!this.hasValidReference()) {
            return null;
        }
        const elapsed = this.getMonotonicTimeMs() - this.monotonicOriginMs;
        return Math.floor(this.serverReferenceMs + Math.max(0, elapsed));
    }
    getRequiredNow() {
        const current = this.now();
        if (current === null) {
            if (this.serverReferenceMs !== null && this.monotonicOriginMs !== null) {
                throw new Error('Lease do relógio do servidor expirado (máximo 5 minutos). É necessária nova sincronização autorizada.');
            }
            throw new Error('Relógio do servidor não sincronizado. É necessária uma referência autoritativa do servidor antes de realizar nova operação.');
        }
        return current;
    }
    clear() {
        this.serverReferenceMs = null;
        this.monotonicOriginMs = null;
        this.generation++;
    }
}
export const serverClock = new ServerClock();
