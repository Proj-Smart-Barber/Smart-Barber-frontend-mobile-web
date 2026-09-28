import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { servicesApi } from '../api/services.api';

describe('ServicesApi', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve listar serviços chamando GET /api/barbershops/:shopId/services', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        items: [
          {
            id: 'srv-1',
            barbershopId: 'shop-1',
            title: 'Corte Degrade',
            priceInCents: 4500,
            durationInMinutes: 30,
            isActive: true,
            createdAt: '2026-09-28T00:00:00Z',
            updatedAt: '2026-09-28T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    } as Response);

    const result = await servicesApi.listServices('shop-1', {
      includeInactive: true,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Corte Degrade');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/barbershops/shop-1/services?includeInactive=true'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('deve criar serviço chamando POST /api/barbershops/:shopId/services', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        service: {
          id: 'srv-new',
          barbershopId: 'shop-1',
          title: 'Barba Terapia',
          priceInCents: 3500,
          durationInMinutes: 20,
          isActive: true,
        },
      }),
    } as Response);

    const result = await servicesApi.createService(
      'shop-1',
      {
        title: 'Barba Terapia',
        priceInCents: 3500,
        durationInMinutes: 20,
      },
      'token-jwt',
    );

    expect(result.id).toBe('srv-new');
    expect(result.title).toBe('Barba Terapia');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/barbershops/shop-1/services'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Barba Terapia',
          priceInCents: 3500,
          durationInMinutes: 20,
        }),
      }),
    );
  });

  it('deve alternar ativação chamando PATCH /api/barbershops/:shopId/services/:serviceId/activation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        service: {
          id: 'srv-1',
          barbershopId: 'shop-1',
          title: 'Corte Degrade',
          priceInCents: 4500,
          durationInMinutes: 30,
          isActive: false,
        },
      }),
    } as Response);

    const result = await servicesApi.toggleServiceActivation(
      'shop-1',
      'srv-1',
      false,
      'token-jwt',
    );

    expect(result.isActive).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/barbershops/shop-1/services/srv-1/activation'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      }),
    );
  });
});
