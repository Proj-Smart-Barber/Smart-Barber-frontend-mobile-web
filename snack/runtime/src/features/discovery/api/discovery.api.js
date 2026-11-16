import { httpClient } from '../../../shared/api';
import { discoveryPageSchema, myBookingsUpcomingResponseSchema, } from './discovery.contract';
export class DiscoveryApi {
    /**
     * Busca textual pública de barbearias ativas (modo ALL)
     * GET /api/barbershops?q=&page=&limit=
     */
    async searchAll(params, signal) {
        const queryParams = {};
        if (params === null || params === void 0 ? void 0 : params.q)
            queryParams.q = params.q.trim().slice(0, 120);
        if (params === null || params === void 0 ? void 0 : params.page)
            queryParams.page = params.page;
        if (params === null || params === void 0 ? void 0 : params.limit)
            queryParams.limit = params.limit;
        const raw = await httpClient.get('/api/barbershops', {
            params: queryParams, signal, publicRequest: true,
        });
        return discoveryPageSchema.parse(raw);
    }
    /**
     * Busca de barbearias por proximidade / geolocalização (modo NEARBY)
     * POST /api/barbershops/nearby
     */
    async searchNearby(params, signal) {
        const body = {
            latitude: params.latitude,
            longitude: params.longitude,
            radiusKm: params.radiusKm,
        };
        if (params.q)
            body.q = params.q.trim().slice(0, 120);
        if (params.page)
            body.page = params.page;
        if (params.limit)
            body.limit = params.limit;
        try {
            const raw = await httpClient.post('/api/barbershops/nearby', body, { signal, publicRequest: true });
            return discoveryPageSchema.parse(raw);
        }
        catch (error) {
            if ((error === null || error === void 0 ? void 0 : error.status) === 503 || (error === null || error === void 0 ? void 0 : error.statusCode) === 503) {
                const err = new Error('O serviço de cálculo de proximidade está temporariamente indisponível.');
                err.isServiceUnavailable = true;
                err.isGeographicUnavailable = true;
                err.statusCode = 503;
                throw err;
            }
            throw error;
        }
    }
    /**
     * Consulta autoritativa da próxima reserva do cliente autenticado
     * GET /api/bookings/me?view=upcoming&limit=1
     */
    async fetchUpcomingBooking(token) {
        var _a;
        const raw = await httpClient.get('/api/bookings/me', {
            params: { view: 'upcoming', limit: 1 },
            token,
        });
        const parsed = myBookingsUpcomingResponseSchema.parse(raw);
        return {
            booking: (_a = parsed.bookings[0]) !== null && _a !== void 0 ? _a : null,
            serverTime: parsed.serverTime,
        };
    }
}
export const discoveryApi = new DiscoveryApi();
