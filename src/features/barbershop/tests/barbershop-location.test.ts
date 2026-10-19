import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from '@/shared/api';
import { serverClock } from '@/features/bookings/lib/server-clock';
import {
  barbershopLocationApi,
  calculateGeoDistanceMeters,
  MAX_PIN_ADJUSTMENT_METERS,
  buildBarbershopLocationQueryKey,
  isCandidateExpired,
} from '../api/barbershop-location.api';

describe('Barbershop Commercial Location (Bloco D)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    serverClock.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('calculateGeoDistanceMeters & Pin Tolerance', () => {
    it('deve calcular 0m para pontos idênticos e respeitar tolerância de 250m', () => {
      const origin = { latitude: -23.561414, longitude: -46.655881 };
      expect(calculateGeoDistanceMeters(origin, origin)).toBe(0);

      // Ajuste fino de ~45m (dentro do limite de 250m)
      const fineAdjusted = { latitude: -23.5618, longitude: -46.655881 };
      const fineDist = calculateGeoDistanceMeters(origin, fineAdjusted);
      expect(fineDist).toBeGreaterThan(30);
      expect(fineDist).toBeLessThanOrEqual(MAX_PIN_ADJUSTMENT_METERS);

      // Deslocamento exagerado de ~600m (fora do limite de 250m)
      const farPoint = { latitude: -23.567, longitude: -46.655881 };
      const farDist = calculateGeoDistanceMeters(origin, farPoint);
      expect(farDist).toBeGreaterThan(MAX_PIN_ADJUSTMENT_METERS);
    });
  });

  describe('isCandidateExpired', () => {
    it('deve validar expiração do candidato contra o tempo de referência autoritativo', () => {
      const candidate = {
        candidateId: '123e4567-e89b-12d3-a456-426614174099',
        displayAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        point: { latitude: -23.561414, longitude: -46.655881 },
        expiresAt: '2026-10-19T12:15:00.000Z',
        attribution: 'Google Maps' as const,
      };

      const beforeExpiryMs = new Date('2026-10-19T12:10:00.000Z').getTime();
      const afterExpiryMs = new Date('2026-10-19T12:16:00.000Z').getTime();

      expect(isCandidateExpired(candidate, beforeExpiryMs)).toBe(false);
      expect(isCandidateExpired(candidate, afterExpiryMs)).toBe(true);
    });
  });

  describe('barbershopLocationApi.searchAddress', () => {
    it('deve chamar POST /api/geocoding/search, validar candidatos Google Maps e sincronizar serverClock', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          candidates: [
            {
              candidateId: '123e4567-e89b-12d3-a456-426614174050',
              displayAddress: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, Brasil',
              point: { latitude: -23.561414, longitude: -46.655881 },
              expiresAt: '2026-10-19T15:15:00.000Z',
              attribution: 'Google Maps',
            },
          ],
          serverTime: '2026-10-19T15:00:00.000Z',
        }),
      } as Response);

      const response = await barbershopLocationApi.searchAddress({
        address: 'Av. Paulista, 1000',
        shopId: '123e4567-e89b-12d3-a456-426614174000',
        token: 'owner-jwt',
      });

      expect(response.candidates).toHaveLength(1);
      expect(response.candidates[0].attribution).toBe('Google Maps');
      expect(serverClock.hasValidReference()).toBe(true);

      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain('/api/geocoding/search');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        address: 'Av. Paulista, 1000',
        shopId: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('deve identificar erro 429 GEOCODING_QUOTA_EXCEEDED com retryAfterSeconds e 503 LOCATION_SERVICE_UNAVAILABLE', () => {
      const quotaErr = new ApiError(
        'Quota excedida',
        429,
        { code: 'GEOCODING_QUOTA_EXCEEDED', retryAfterSeconds: 120 },
        false,
      );
      expect(barbershopLocationApi.isQuotaExceededError(quotaErr)).toEqual({
        isQuota: true,
        retryAfterSeconds: 120,
      });

      const unavailableErr = new ApiError(
        'Serviço indisponível',
        503,
        { code: 'LOCATION_SERVICE_UNAVAILABLE' },
        false,
      );
      expect(barbershopLocationApi.isServiceUnavailableError(unavailableErr)).toBe(true);
    });
  });

  describe('barbershopLocationApi.getLocation & updateLocation', () => {
    it('deve consultar GET /api/barbershops/:shopId/location e confirmar via PATCH com expectedVersion e Idempotency-Key', async () => {
      const shopId = '123e4567-e89b-12d3-a456-426614174000';
      const candidateId = '123e4567-e89b-12d3-a456-426614174050';
      const mutationId = '0192a5f0-0000-7000-8000-000000000001';

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            shopId,
            address: 'Av. Paulista, 1000',
            status: 'UNCONFIRMED',
            source: 'MANUAL',
            version: 0,
            point: null,
            confirmedAt: null,
            acquiredAt: null,
            validUntil: null,
            lastOwnerMutation: null,
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            shopId,
            address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
            status: 'CONFIRMED',
            source: 'GOOGLE',
            version: 1,
            point: { latitude: -23.5615, longitude: -46.6559 },
            confirmedAt: '2026-10-19T15:01:00.000Z',
            acquiredAt: '2026-10-19T15:01:00.000Z',
            validUntil: '2026-11-13T15:01:00.000Z',
            lastOwnerMutation: {
              id: mutationId,
              commandHash: 'hash-abc',
              savedVersion: 1,
            },
          }),
        } as Response);

      const initial = await barbershopLocationApi.getLocation(shopId, 'owner-jwt');
      expect(initial.status).toBe('UNCONFIRMED');
      expect(initial.version).toBe(0);

      const confirmed = await barbershopLocationApi.updateLocation({
        shopId,
        address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        candidateId,
        latitude: -23.5615,
        longitude: -46.6559,
        expectedVersion: initial.version,
        mutationId,
        token: 'owner-jwt',
      });

      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.version).toBe(1);
      expect(confirmed.lastOwnerMutation?.id).toBe(mutationId);

      const [patchUrl, patchInit] = vi.mocked(global.fetch).mock.calls[1];
      expect(patchUrl).toContain(`/api/barbershops/${shopId}/location`);
      expect(patchInit?.method).toBe('PATCH');
      const headersAny = patchInit?.headers as Headers;
      expect(headersAny.get('Idempotency-Key')).toBe(mutationId);
      expect(JSON.parse(String(patchInit?.body))).toEqual({
        address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        candidateId,
        latitude: -23.5615,
        longitude: -46.6559,
        expectedVersion: 0,
        mutationId,
      });
    });

    it('deve classificar conflito 409 LOCATION_VERSION_CONFLICT e erro incerto de timeout/rede', () => {
      const conflictErr = new ApiError(
        'Conflito de versão',
        409,
        { code: 'LOCATION_VERSION_CONFLICT' },
        false,
      );
      expect(barbershopLocationApi.isVersionConflictError(conflictErr)).toBe(true);

      const timeoutErr = new ApiError('Timeout', 0, null, true);
      expect(barbershopLocationApi.isUncertainError(timeoutErr)).toBe(true);
    });

    it('deve isolar a queryKey de localização comercial por shopId e actorId', () => {
      expect(buildBarbershopLocationQueryKey('shop-1', 'actor-1')).toEqual([
        'barbershop',
        'shop-1',
        'location',
        'actor-1',
      ]);
      expect(buildBarbershopLocationQueryKey('shop-2', 'actor-1')).not.toEqual(
        buildBarbershopLocationQueryKey('shop-1', 'actor-1'),
      );
    });
  });
});
