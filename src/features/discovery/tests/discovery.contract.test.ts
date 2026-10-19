import { describe, it, expect } from 'vitest';
import {
  publicShopSchema,
  discoveryPageSchema,
  nextBookingItemSchema,
  myBookingsUpcomingResponseSchema,
  buildBarbershopCatalogHref,
} from '../api/discovery.contract';

describe('Discovery Contracts & Schemas', () => {
  describe('publicShopSchema', () => {
    it('deve validar um estabelecimento completo com coordenadas e distância real', () => {
      const validShop = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Barbearia Vintage Club',
        slug: 'barbearia-vintage-club',
        location: 'Rua das Flores, 123, Centro',
        avatarUrl: 'https://images.unsplash.com/photo-barber',
        coordinates: {
          latitude: -23.55052,
          longitude: -46.633308,
        },
        distanceMeters: 2340,
      };

      const parsed = publicShopSchema.safeParse(validShop);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe('Barbearia Vintage Club');
        expect(parsed.data.distanceMeters).toBe(2340);
        expect(parsed.data.coordinates?.latitude).toBe(-23.55052);
      }
    });

    it('deve validar um estabelecimento com avatar, coordenadas e distância nulos', () => {
      const minimalShop = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Barbearia do Bairro',
        slug: 'barbearia-do-bairro',
        location: 'Centro Histórico',
        avatarUrl: null,
        coordinates: null,
        distanceMeters: null,
      };

      const parsed = publicShopSchema.safeParse(minimalShop);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.id).toBe('123e4567-e89b-12d3-a456-426614174001');
        expect(parsed.data.distanceMeters).toBeNull();
      }
    });

    it('deve rejeitar estabelecimento sem nome ou sem id válido UUID', () => {
      const invalidShop = {
        id: 'not-a-uuid',
        name: 'Sem UUID válido',
        slug: 'sem-uuid',
        location: 'Centro',
        avatarUrl: null,
        coordinates: null,
        distanceMeters: null,
      };

      const parsed = publicShopSchema.safeParse(invalidShop);
      expect(parsed.success).toBe(false);
    });

    it('deve rejeitar coordenadas fora dos limites geográficos', () => {
      const invalidCoords = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Barbearia Fora do Planeta',
        slug: 'barbearia-fora',
        location: 'Órbita',
        avatarUrl: null,
        coordinates: {
          latitude: 105.0, // latitude máxima é 90
          longitude: -46.0,
        },
        distanceMeters: null,
      };

      const parsed = publicShopSchema.safeParse(invalidCoords);
      expect(parsed.success).toBe(false);
    });
  });

  describe('discoveryPageSchema', () => {
    it('deve validar página de busca com estabelecimentos e metadados de paginação', () => {
      const pageData = {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174010',
            name: 'Barbearia Alpha',
            slug: 'barbearia-alpha',
            location: 'Paulista',
            avatarUrl: null,
            coordinates: { latitude: -23.55, longitude: -46.63 },
            distanceMeters: 1200,
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174011',
            name: 'Barbearia Beta',
            slug: 'barbearia-beta',
            location: 'Pinheiros',
            avatarUrl: null,
            coordinates: null,
            distanceMeters: null,
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
        hasNext: false,
        serverTime: '2026-10-15T20:00:00.000Z',
      };

      const parsed = discoveryPageSchema.safeParse(pageData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items).toHaveLength(2);
        expect(parsed.data.total).toBe(2);
        expect(parsed.data.hasNext).toBe(false);
      }
    });

    it('deve validar página vazia', () => {
      const emptyPage = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasNext: false,
        serverTime: '2026-10-15T20:00:00.000Z',
      };

      const parsed = discoveryPageSchema.safeParse(emptyPage);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items).toHaveLength(0);
      }
    });
  });

  describe('nextBookingItemSchema & myBookingsUpcomingResponseSchema', () => {
    it('deve validar resposta autoritativa de próximo atendimento com serverTime', () => {
      const responseData = {
        bookings: [
          {
            id: '123e4567-e89b-12d3-a456-426614174020',
            barbershopId: '123e4567-e89b-12d3-a456-426614174021',
            barbershopName: 'Barbearia Central',
            barbermanId: '123e4567-e89b-12d3-a456-426614174022',
            barbermanName: 'João Navalha',
            startsAt: '2026-10-16T14:30:00.000Z',
            endsAt: '2026-10-16T15:00:00.000Z',
            status: 'CONFIRMED' as const,
            services: [
              {
                serviceId: '123e4567-e89b-12d3-a456-426614174023',
                title: 'Corte Tradicional',
                priceInCents: 4500,
                durationInMinutes: 30,
              },
            ],
            totalPriceInCents: 4500,
            totalDurationInMinutes: 30,
          },
        ],
        serverTime: '2026-10-15T20:00:00.000Z',
      };

      const parsed = myBookingsUpcomingResponseSchema.safeParse(responseData);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.bookings).toHaveLength(1);
        expect(parsed.data.bookings[0].barbershopName).toBe('Barbearia Central');
        expect(parsed.data.serverTime).toBe('2026-10-15T20:00:00.000Z');
      }
    });

    it('deve aceitar resposta com lista de agendamentos vazia (nenhum próximo atendimento)', () => {
      const emptyBookingsResponse = {
        bookings: [],
        serverTime: '2026-10-15T20:00:00.000Z',
      };

      const parsed = myBookingsUpcomingResponseSchema.safeParse(emptyBookingsResponse);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.bookings).toHaveLength(0);
      }
    });

    it('deve aceitar snapshots históricos de serviços com priceInCents e durationInMinutes nulos', () => {
      const legacySnapshotBooking = {
        bookings: [
          {
            id: '123e4567-e89b-12d3-a456-426614174030',
            barbershopId: '123e4567-e89b-12d3-a456-426614174031',
            barbershopName: 'Barbearia Histórica',
            barbermanId: '123e4567-e89b-12d3-a456-426614174032',
            barbermanName: 'Pedro',
            startsAt: '2026-10-18T11:00:00.000Z',
            status: 'CONFIRMED' as const,
            services: [
              {
                serviceId: null,
                title: 'Serviço Legado',
                priceInCents: null,
                durationInMinutes: null,
              },
            ],
            totalPriceInCents: null,
            totalDurationInMinutes: null,
          },
        ],
        serverTime: '2026-10-18T10:00:00.000Z',
      };

      const parsed = myBookingsUpcomingResponseSchema.safeParse(legacySnapshotBooking);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.bookings[0].services?.[0].priceInCents).toBeNull();
        expect(parsed.data.bookings[0].services?.[0].durationInMinutes).toBeNull();
      }
    });
  });

  describe('buildBarbershopCatalogHref', () => {
    it('deve apontar sempre para a rota oficial de catálogo /barbershops/:shopId/services', () => {
      expect(buildBarbershopCatalogHref('123e4567-e89b-12d3-a456-426614174000')).toBe(
        '/barbershops/123e4567-e89b-12d3-a456-426614174000/services',
      );
    });
  });
});
