import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { discoveryApi } from '../api/discovery.api';

describe('Discovery API Transport', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('searchAll', () => {
    it('deve consultar barbearias por nome ou endereço chamando GET /api/barbershops', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Barbearia Clássica',
              slug: 'barbearia-classica',
              location: 'Av. Paulista, 1000',
              avatarUrl: null,
              coordinates: null,
              distanceMeters: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          hasNext: false,
          serverTime: '2026-10-15T20:00:00.000Z',
        }),
      } as Response);

      const result = await discoveryApi.searchAll({
        q: 'Paulista',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Barbearia Clássica');

      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain('/api/barbershops?q=Paulista&page=1&limit=10');
      expect(init?.method).toBe('GET');
    });
  });

  describe('searchNearby', () => {
    it('deve consultar barbearias próximas chamando POST /api/barbershops/nearby com coordenadas autorizadas', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174001',
              name: 'Barbearia Próxima',
              slug: 'barbearia-proxima',
              location: 'Pinheiros',
              avatarUrl: null,
              coordinates: { latitude: -23.55, longitude: -46.63 },
              distanceMeters: 1500,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          hasNext: false,
          serverTime: '2026-10-15T20:00:00.000Z',
        }),
      } as Response);

      const result = await discoveryApi.searchNearby({
        latitude: -23.55052,
        longitude: -46.633308,
        radiusKm: 10,
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].distanceMeters).toBe(1500);

      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain('/api/barbershops/nearby');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe(
        JSON.stringify({
          latitude: -23.55052,
          longitude: -46.633308,
          radiusKm: 10,
          page: 1,
          limit: 10,
        })
      );
    });

    it('deve identificar erro HTTP 503 como falha geográfica sem quebrar a aplicação', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Serviço de cálculo geográfico temporariamente indisponível',
        }),
      } as Response);

      await expect(
        discoveryApi.searchNearby({
          latitude: -23.55,
          longitude: -46.63,
          radiusKm: 5,
        })
      ).rejects.toMatchObject({
        isGeographicUnavailable: true,
        isServiceUnavailable: true,
        statusCode: 503,
      });
    });
  });

  describe('fetchUpcomingBooking', () => {
    it('deve buscar o próximo atendimento autoritativo com view=upcoming e limit=1', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          bookings: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              barbershopId: '123e4567-e89b-12d3-a456-426614174003',
              barbershopName: 'Barbearia Vintage',
              barbermanId: '123e4567-e89b-12d3-a456-426614174004',
              barbermanName: 'Carlos',
              startsAt: '2026-10-16T10:00:00.000Z',
              endsAt: '2026-10-16T10:45:00.000Z',
              status: 'CONFIRMED',
              services: [
                {
                  serviceId: '123e4567-e89b-12d3-a456-426614174005',
                  title: 'Barba e Cabelo',
                  priceInCents: 6000,
                  durationInMinutes: 45,
                },
              ],
              totalPriceInCents: 6000,
              totalDurationInMinutes: 45,
            },
          ],
          serverTime: '2026-10-15T20:00:00.000Z',
        }),
      } as Response);

      const result = await discoveryApi.fetchUpcomingBooking('mock-jwt-token');

      expect(result.booking?.id).toBe('123e4567-e89b-12d3-a456-426614174002');
      expect(result.serverTime).toBe('2026-10-15T20:00:00.000Z');

      const [url, init] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain('/api/bookings/me?view=upcoming&limit=1');
      expect(init?.method).toBe('GET');

      const headersAny = init?.headers as any;
      const authHeader =
        typeof headersAny?.get === 'function'
          ? headersAny.get('Authorization')
          : headersAny?.Authorization;
      expect(authHeader).toBe('Bearer mock-jwt-token');
    });

    it('deve retornar booking nulo quando o cliente não tiver agendamentos futuros', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          bookings: [],
          serverTime: '2026-10-15T20:00:00.000Z',
        }),
      } as Response);

      const result = await discoveryApi.fetchUpcomingBooking('mock-jwt-token');

      expect(result.booking).toBeNull();
      expect(result.serverTime).toBe('2026-10-15T20:00:00.000Z');
    });
  });
});
