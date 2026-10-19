import { z } from 'zod';
import { httpClient, ApiError } from '@/shared/api';
import { serverClock } from '@/features/bookings/lib/server-clock';
import { geoPointSchema, type GeoPoint } from '@/features/discovery/api/discovery.contract';

export const geocodingCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  displayAddress: z.string().min(1),
  point: geoPointSchema,
  expiresAt: z.string().min(1),
  attribution: z.literal('Google Maps'),
});

export type GeocodingCandidate = z.infer<typeof geocodingCandidateSchema>;

export const geocodingSearchResponseSchema = z.object({
  candidates: z.array(geocodingCandidateSchema),
  serverTime: z.string().optional(),
});

export type GeocodingSearchResponse = z.infer<typeof geocodingSearchResponseSchema>;

export const lastOwnerMutationSchema = z.object({
  id: z.string().min(1),
  commandHash: z.string().min(1),
  savedVersion: z.number().int().min(0),
});

export type LastOwnerMutation = z.infer<typeof lastOwnerMutationSchema>;

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

export type BarbershopLocationState = z.infer<typeof barbershopLocationStateSchema>;

export interface SearchGeocodingAddressInput {
  address: string;
  shopId?: string | null;
  token?: string | null;
}

export interface UpdateBarbershopLocationInput {
  shopId: string;
  address: string;
  candidateId: string;
  latitude: number;
  longitude: number;
  expectedVersion: number;
  mutationId: string;
  token?: string | null;
}

export const MAX_PIN_ADJUSTMENT_METERS = 250;

/**
 * Calcula distância aproximada em metros entre dois pontos geográficos (Haversine).
 * Usado para validar a tolerância máxima de ajuste fino do pino (<= 250m).
 */
export function calculateGeoDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export class LocationResponseParsingError extends Error {
  readonly isPostTransport = true;
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'LocationResponseParsingError';
  }
}

export class BarbershopLocationApi {
  /**
   * Busca candidatos geocodificados para um endereço comercial:
   * POST /api/geocoding/search
   */
  async searchAddress(
    input: SearchGeocodingAddressInput,
  ): Promise<GeocodingSearchResponse> {
    const expectedGeneration = serverClock.getGeneration();
    const raw = await httpClient.post<unknown>(
      '/api/geocoding/search',
      {
        address: input.address.trim(),
        shopId: input.shopId ?? null,
      },
      { token: input.token },
    );

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
  async getLocation(
    shopId: string,
    token?: string | null,
  ): Promise<BarbershopLocationState> {
    const raw = await httpClient.get<unknown>(
      `/api/barbershops/${encodeURIComponent(shopId)}/location`,
      { token },
    );

    return barbershopLocationStateSchema.parse(raw);
  }

  /**
   * Confirma ou atualiza a localização comercial com candidato Google, ajuste fino,
   * trava otimista (expectedVersion) e chave de idempotência (mutationId):
   * PATCH /api/barbershops/:shopId/location
   */
  async updateLocation(
    input: UpdateBarbershopLocationInput,
  ): Promise<BarbershopLocationState> {
    const raw = await httpClient.patch<unknown>(
      `/api/barbershops/${encodeURIComponent(input.shopId)}/location`,
      {
        address: input.address.trim(),
        candidateId: input.candidateId,
        latitude: input.latitude,
        longitude: input.longitude,
        expectedVersion: input.expectedVersion,
        mutationId: input.mutationId,
      },
      {
        token: input.token,
        headers: {
          'Idempotency-Key': input.mutationId,
        },
      },
    );

    try {
      return barbershopLocationStateSchema.parse(raw);
    } catch (parseError) {
      throw new LocationResponseParsingError(
        'A resposta de sucesso da localização comercial não pôde ser interpretada.',
        parseError,
      );
    }
  }

  isVersionConflictError(err: unknown): boolean {
    if (err instanceof ApiError) {
      const code = err.data?.code || err.data?.error?.code;
      return err.status === 409 && code === 'LOCATION_VERSION_CONFLICT';
    }
    return false;
  }

  isQuotaExceededError(err: unknown): {
    isQuota: boolean;
    retryAfterSeconds: number | null;
  } {
    if (err instanceof ApiError && err.status === 429) {
      const retry =
        err.data?.retryAfterSeconds ??
        err.data?.error?.retryAfterSeconds ??
        null;
      return {
        isQuota: true,
        retryAfterSeconds: typeof retry === 'number' ? retry : null,
      };
    }
    return { isQuota: false, retryAfterSeconds: null };
  }

  isServiceUnavailableError(err: unknown): boolean {
    return err instanceof ApiError && err.status === 503;
  }

  isUncertainError(err: unknown): boolean {
    if (err instanceof LocationResponseParsingError) {
      return true;
    }
    if (err instanceof ApiError) {
      return (
        err.isNetworkError ||
        err.status === 0 ||
        err.status === 408 ||
        err.status === 500 ||
        err.status === 502 ||
        err.status === 503 ||
        err.status === 504
      );
    }
    if (err instanceof SyntaxError || err instanceof TypeError) {
      return true;
    }
    return false;
  }
}

export const barbershopLocationApi = new BarbershopLocationApi();

export function buildBarbershopLocationQueryKey(
  shopId?: string | null,
  actorId?: string | null,
) {
  return ['barbershop', shopId ?? 'none', 'location', actorId ?? 'anon'] as const;
}

export function isCandidateExpired(
  candidate: GeocodingCandidate,
  referenceMs?: number | null,
): boolean {
  const expiresMs = new Date(candidate.expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return true;
  let nowMs: number;
  if (typeof referenceMs === 'number') {
    nowMs = referenceMs;
  } else {
    try {
      nowMs = serverClock.getRequiredNow();
    } catch {
      nowMs = serverClock.now() ?? 0;
    }
  }
  return expiresMs <= nowMs;
}
