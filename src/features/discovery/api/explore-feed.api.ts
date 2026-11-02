import { httpClient } from '@/shared/api';
import {
  exploreFeedPageSchema,
  type ExploreFeedInput,
  type ExploreFeedPage,
} from './explore-feed.contract';

export class ExploreFeedApi {
  /**
   * Consulta o feed vertical do Explorar (modo Reels)
   * POST /api/barbershops/explore-feed
   */
  async getFeed(input: ExploreFeedInput, signal?: AbortSignal): Promise<ExploreFeedPage> {
    const payload: Record<string, unknown> = {
      mode: input.mode,
    };

    if (input.mode === 'NEARBY' && input.point) {
      payload.latitude = input.point.latitude;
      payload.longitude = input.point.longitude;
      payload.radiusKm = input.radiusKm ?? 10;
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

    const raw = await httpClient.post<unknown>('/api/barbershops/explore-feed', payload, {
      signal,
    });

    return exploreFeedPageSchema.parse(raw);
  }
}

export const exploreFeedApi = new ExploreFeedApi();
