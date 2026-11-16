import { httpClient } from '../../../shared/api';
import { exploreFeedPageSchema, } from './explore-feed.contract';
export class ExploreFeedApi {
    /**
     * Consulta o feed vertical do Explorar (modo Reels)
     * POST /api/barbershops/explore-feed
     */
    async getFeed(input, signal) {
        var _a;
        const payload = {
            mode: input.mode,
        };
        if (input.mode === 'NEARBY' && input.point) {
            payload.latitude = input.point.latitude;
            payload.longitude = input.point.longitude;
            payload.radiusKm = (_a = input.radiusKm) !== null && _a !== void 0 ? _a : 10;
        }
        if (input.q) {
            payload.q = input.q.trim().slice(0, 120);
        }
        if (input.regionKey) {
            payload.regionKey = input.regionKey;
        }
        if (input.limit) {
            payload.limit = input.limit;
        }
        if (input.cursor) {
            payload.cursor = input.cursor;
        }
        const raw = await httpClient.post('/api/barbershops/explore-feed', payload, {
            signal, publicRequest: true,
        });
        return exploreFeedPageSchema.parse(raw);
    }
}
export const exploreFeedApi = new ExploreFeedApi();
