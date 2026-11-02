import { describe, it, expect } from 'vitest';
import {
  exploreFeedPageSchema,
  exploreFeedItemSchema,
  exploreFeedMediaItemSchema,
} from '../api/explore-feed.contract';

describe('Explore Feed Contract', () => {
  it('deve validar um item de mídia de serviço com preço e duração', () => {
    const raw = {
      id: 'photo-1',
      kind: 'service',
      mediaId: 'PXS-123',
      serviceId: 'srv-1',
      url: 'https://images.example.com/photo.jpg',
      width: 1080,
      height: 1920,
      alt: 'Corte Degradê',
      focalPoint: '50% 50%',
      category: 'corte_maquina',
      service: {
        id: 'srv-1',
        title: 'Degradê na Máquina',
        priceInCents: 5000,
        durationInMinutes: 35,
      },
    };

    const parsed = exploreFeedMediaItemSchema.parse(raw);
    expect(parsed.kind).toBe('service');
    expect(parsed.service?.priceInCents).toBe(5000);
  });

  it('deve validar item de mídia ambiental com service nulo', () => {
    const raw = {
      id: 'photo-env-1',
      kind: 'environment',
      mediaId: 'PXS-ENV-1',
      serviceId: null,
      url: 'https://images.example.com/interior.jpg',
      width: 1080,
      height: 1920,
      alt: 'Salão da Barbearia',
      focalPoint: '50% 50%',
      category: 'interior',
      service: null,
    };

    const parsed = exploreFeedMediaItemSchema.parse(raw);
    expect(parsed.kind).toBe('environment');
    expect(parsed.service).toBeNull();
  });

  it('deve validar uma página completa do feed com rankingScore e cursores', () => {
    const rawPage = {
      items: [
        {
          barbershop: {
            id: 'shop-1',
            slug: 'barbearia-horizonte-demo',
            name: 'Barbearia Horizonte — Demonstração',
            location: 'Vila Mariana, São Paulo',
            logoUrl: 'https://images.example.com/logo.png',
            rating: 4.8,
            reviewCount: 126,
            googleMapsUrl: 'https://maps.google.com',
          },
          distanceMeters: 1200,
          distanceBasis: 'user',
          rankingScore: {
            score: 0.85,
            distanceComponent: 0.67,
            reputationComponent: 0.95,
            bayesRating: 4.75,
          },
          media: [
            {
              id: 'm1',
              kind: 'service',
              mediaId: 'asset-1',
              serviceId: 's1',
              url: 'https://images.example.com/service.jpg',
              width: 1080,
              height: 1920,
              alt: 'Barba completa',
              service: {
                id: 's1',
                title: 'Barba completa',
                priceInCents: 4500,
                durationInMinutes: 30,
              },
            },
          ],
        },
      ],
      nextCursor: 'signed.cursor.token',
      hasNext: true,
      total: 10,
      rankingVersion: 'v1-2026-11-01',
      snapshotExpiresAt: new Date().toISOString(),
    };

    const parsed = exploreFeedPageSchema.parse(rawPage);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].barbershop.name).toContain('Horizonte');
    expect(parsed.hasNext).toBe(true);
    expect(parsed.nextCursor).toBe('signed.cursor.token');
  });
});
