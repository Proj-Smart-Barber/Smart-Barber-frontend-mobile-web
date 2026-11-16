import { z } from 'zod';
import { httpClient, ApiError } from '../../../shared/api';
import { serverClock } from '../../bookings/lib/server-clock';
import { geoPointSchema } from '../../discovery/api/discovery.contract';
export const geocodingCandidateSchema = z.object({
    candidateId: z.string().uuid(),
    displayAddress: z.string().min(1),
    point: geoPointSchema,
    expiresAt: z.string().min(1),
    attribution: z.literal('Google Maps'),
});
export const geocodingSearchResponseSchema = z.object({
    candidates: z.array(geocodingCandidateSchema),
    serverTime: z.string().optional(),
});
export const lastOwnerMutationSchema = z.object({
    id: z.string().min(1),
    commandHash: z.string().min(1),
    savedVersion: z.number().int().min(0),
});
export const barbershopLocationStateSchema = z.object({
    shopId: z.string().uuid(),
    address: z.string(),
    status: z.enum(['UNCONFIRMED', 'CONFIRMED', 'NEEDS_REVIEW']),
    source: z.enum(['MANUAL', 'GOOGLE']),
    version: z.number().int().min(0),
    point: geoPointSchema.nullable(),
    confirmedAt: z.string().nullable(),
    acquiredAt: z.string().nullable(),
    validUntil: z.string().nullable(),
    lastOwnerMutation: lastOwnerMutationSchema.nullable(),
});
export const MAX_PIN_ADJUSTMENT_METERS = 250;
/**
 * Calcula distância aproximada em metros entre dois pontos geográficos (Haversine).
 * Usado para validar a tolerância máxima de ajuste fino do pino (<= 250m).
 */
export function calculateGeoDistanceMeters(a, b) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat +
        Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export class LocationResponseParsingError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.isPostTransport = true;
        this.name = 'LocationResponseParsingError';
    }
}
export class BarbershopLocationApi {
    /**
     * Busca candidatos geocodificados para um endereço comercial:
     * POST /api/geocoding/search
     */
    async searchAddress(input) {
        var _a;
        const expectedGeneration = serverClock.getGeneration();
        const raw = await httpClient.post('/api/geocoding/search', {
            address: input.address.trim(),
            shopId: (_a = input.shopId) !== null && _a !== void 0 ? _a : null,
        }, { token: input.token });
        const parsed = geocodingSearchResponseSchema.parse(raw);
        if (parsed.serverTime) {
            serverClock.syncWithServer(parsed.serverTime, { expectedGeneration });
        }
        return parsed;
    }
    /**
     * Consulta o estado autoritativo da localização comercial da barbearia:
     * GET /api/barbershops/:shopId/location
     */
    async getLocation(shopId, token) {
        const raw = await httpClient.get(`/api/barbershops/${encodeURIComponent(shopId)}/location`, { token });
        return barbershopLocationStateSchema.parse(raw);
    }
    /**
     * Confirma ou atualiza a localização comercial com candidato Google, ajuste fino,
     * trava otimista (expectedVersion) e chave de idempotência (mutationId):
     * PATCH /api/barbershops/:shopId/location
     */
    async updateLocation(input) {
        const raw = await httpClient.patch(`/api/barbershops/${encodeURIComponent(input.shopId)}/location`, {
            address: input.address.trim(),
            candidateId: input.candidateId,
            latitude: input.latitude,
            longitude: input.longitude,
            expectedVersion: input.expectedVersion,
            mutationId: input.mutationId,
        }, {
            token: input.token,
            headers: {
                'Idempotency-Key': input.mutationId,
            },
        });
        try {
            return barbershopLocationStateSchema.parse(raw);
        }
        catch (parseError) {
            throw new LocationResponseParsingError('A resposta de sucesso da localização comercial não pôde ser interpretada.', parseError);
        }
    }
    isVersionConflictError(err) {
        var _a, _b, _c;
        if (err instanceof ApiError) {
            const code = ((_a = err.data) === null || _a === void 0 ? void 0 : _a.code) || ((_c = (_b = err.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.code);
            return err.status === 409 && code === 'LOCATION_VERSION_CONFLICT';
        }
        return false;
    }
    isQuotaExceededError(err) {
        var _a, _b, _c, _d, _e;
        if (err instanceof ApiError && err.status === 429) {
            const retry = (_e = (_b = (_a = err.data) === null || _a === void 0 ? void 0 : _a.retryAfterSeconds) !== null && _b !== void 0 ? _b : (_d = (_c = err.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.retryAfterSeconds) !== null && _e !== void 0 ? _e : null;
            return {
                isQuota: true,
                retryAfterSeconds: typeof retry === 'number' ? retry : null,
            };
        }
        return { isQuota: false, retryAfterSeconds: null };
    }
    isServiceUnavailableError(err) {
        return err instanceof ApiError && err.status === 503;
    }
    isUncertainError(err) {
        if (err instanceof LocationResponseParsingError) {
            return true;
        }
        if (err instanceof ApiError) {
            return (err.isNetworkError ||
                err.status === 0 ||
                err.status === 408 ||
                err.status === 500 ||
                err.status === 502 ||
                err.status === 503 ||
                err.status === 504);
        }
        if (err instanceof SyntaxError || err instanceof TypeError) {
            return true;
        }
        return false;
    }
}
export const barbershopLocationApi = new BarbershopLocationApi();
export function buildBarbershopLocationQueryKey(shopId, actorId) {
    return ['barbershop', shopId !== null && shopId !== void 0 ? shopId : 'none', 'location', actorId !== null && actorId !== void 0 ? actorId : 'anon'];
}
export function isCandidateExpired(candidate, referenceMs) {
    var _a;
    const expiresMs = new Date(candidate.expiresAt).getTime();
    if (Number.isNaN(expiresMs))
        return true;
    let nowMs;
    if (typeof referenceMs === 'number') {
        nowMs = referenceMs;
    }
    else {
        try {
            nowMs = serverClock.getRequiredNow();
        }
        catch {
            nowMs = (_a = serverClock.now()) !== null && _a !== void 0 ? _a : 0;
        }
    }
    return expiresMs <= nowMs;
}
