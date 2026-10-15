import { httpClient } from '@/shared/api';
import {
  discoveryPageSchema,
  myBookingsUpcomingResponseSchema,
  type DiscoveryPage,
  type NextBookingItem,
} from './discovery.contract';

export interface SearchAllParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface SearchNearbyParams {
  latitude: number;
  longitude: number;
  radiusKm: 5 | 10 | 25 | 50;
  q?: string;
  page?: number;
  limit?: number;
}

export interface UpcomingBookingResult {
  booking: NextBookingItem | null;
  serverTime: string;
}

export class DiscoveryApi {
  /**
   * Busca textual pública de barbearias ativas (modo ALL)
   * GET /api/barbershops?q=&page=&limit=
   */
  async searchAll(params?: SearchAllParams): Promise<DiscoveryPage> {
    const queryParams: Record<string, string | number | undefined> = {};
    if (params?.q) queryParams.q = params.q.trim().slice(0, 120);
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;

    const raw = await httpClient.get<unknown>('/api/barbershops', {
      params: queryParams,
    });

    return discoveryPageSchema.parse(raw);
  }

  /**
   * Busca de barbearias por proximidade / geolocalização (modo NEARBY)
   * POST /api/barbershops/nearby
   */
  async searchNearby(params: SearchNearbyParams): Promise<DiscoveryPage> {
    const body: Record<string, unknown> = {
      latitude: params.latitude,
      longitude: params.longitude,
      radiusKm: params.radiusKm,
    };
    if (params.q) body.q = params.q.trim().slice(0, 120);
    if (params.page) body.page = params.page;
    if (params.limit) body.limit = params.limit;

    try {
      const raw = await httpClient.post<unknown>('/api/barbershops/nearby', body);
      return discoveryPageSchema.parse(raw);
    } catch (error: any) {
      if (error?.status === 503 || error?.statusCode === 503) {
        const err = new Error(
          'O serviço de cálculo de proximidade está temporariamente indisponível.',
        );
        (err as any).isServiceUnavailable = true;
        (err as any).isGeographicUnavailable = true;
        (err as any).statusCode = 503;
        throw err;
      }
      throw error;
    }
  }

  /**
   * Consulta autoritativa da próxima reserva do cliente autenticado
   * GET /api/bookings/me?view=upcoming&limit=1
   */
  async fetchUpcomingBooking(token?: string | null): Promise<UpcomingBookingResult> {
    const raw = await httpClient.get<unknown>('/api/bookings/me', {
      params: { view: 'upcoming', limit: 1 },
      token,
    });

    const parsed = myBookingsUpcomingResponseSchema.parse(raw);
    return {
      booking: parsed.bookings[0] ?? null,
      serverTime: parsed.serverTime,
    };
  }
}

export const discoveryApi = new DiscoveryApi();
