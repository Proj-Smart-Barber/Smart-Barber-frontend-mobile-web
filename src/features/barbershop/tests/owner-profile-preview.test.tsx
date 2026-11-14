// @vitest-environment happy-dom
import React from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  session: {
    status: 'authenticated',
    identity: { id: 'user-owner-1', name: 'Alvaro Dono', accountType: 'OWNER' },
    selectedShopId: 'shop-preview-001',
    token: 'synthetic-jwt-token',
    barbershop: {
      id: 'shop-preview-001',
      name: 'Barbearia Vintage Alfa',
      avatarUrl: 'https://cdn.smartbarber.com/logo.png',
      coverUrl: 'https://cdn.smartbarber.com/cover.png',
      timezone: 'America/Sao_Paulo',
      location: 'Rua das Flores, 123 - Centro',
      googleMapsUrl: 'https://maps.google.com/?q=barbearia',
    },
    memberships: [
      {
        id: 'shop-preview-001',
        role: 'OWNER',
        state: 'ACTIVE',
        status: 'ACTIVE',
        name: 'Barbearia Vintage Alfa',
        timezone: 'America/Sao_Paulo',
      },
    ],
  },
  shopDetails: {
    id: 'shop-preview-001',
    name: 'Barbearia Vintage Alfa',
    avatarUrl: 'https://cdn.smartbarber.com/logo.png',
    coverUrl: 'https://cdn.smartbarber.com/cover.png',
    timezone: 'America/Sao_Paulo',
    location: 'Rua das Flores, 123 - Centro',
    googleMapsUrl: 'https://maps.google.com/?q=barbearia',
    cnpj: '12345678000199',
    rating: 4.9,
    reviewCount: 38,
  },
  services: {
    items: [
      {
        id: 'srv-01',
        barbershopId: 'shop-preview-001',
        title: 'Corte Degradê Navalhado',
        description: 'Corte completo com acabamento fino',
        priceInCents: 4500,
        durationInMinutes: 40,
        isActive: true,
        isFeatured: true,
        featuredOrder: 1,
        imageUrl: 'https://cdn.smartbarber.com/service-fade.jpg',
        rating: 5.0,
        reviewCount: 15,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'srv-02',
        barbershopId: 'shop-preview-001',
        title: 'Barboterapia Completa',
        description: 'Toalha quente e massagem facial',
        priceInCents: 3500,
        durationInMinutes: 30,
        isActive: true,
        isFeatured: false,
        featuredOrder: null,
        imageUrl: null,
        rating: 4.8,
        reviewCount: 10,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    total: 2,
    page: 1,
    limit: 100,
  },
  gallery: [
    {
      id: 'gal-01',
      publicUrl: 'https://cdn.smartbarber.com/ambient-1.jpg',
      posterUrl: null,
      isCover: true,
      displayOrder: 1,
      mimeType: 'image/jpeg',
      caption: 'Fachada e Recepção',
    },
    {
      id: 'gal-02',
      publicUrl: 'https://cdn.smartbarber.com/ambient-2.jpg',
      posterUrl: null,
      isCover: false,
      displayOrder: 2,
      mimeType: 'image/jpeg',
      caption: 'Bancadas e Poltronas',
    },
  ],
  reviews: {
    averageRating: 4.9,
    reviewCount: 38,
    reviews: [],
  },
}));

vi.mock('@/features/auth/model/use-session', () => ({
  useSession: () => fixture.session,
}));

vi.mock('@/features/auth', () => ({
  useSession: () => fixture.session,
}));

vi.mock('@/features/barbershop/api/barbershop.api', () => ({
  barbershopApi: {
    getBarbershop: vi.fn().mockImplementation(() => Promise.resolve(fixture.shopDetails)),
  },
}));

vi.mock('@/features/services/api/services.api', () => ({
  servicesApi: {
    listServices: vi.fn().mockImplementation(() => Promise.resolve(fixture.services)),
  },
}));

vi.mock('@/features/media/api/media.api', () => ({
  mediaApi: {
    getBarbershopGallery: vi.fn().mockImplementation(() => Promise.resolve(fixture.gallery)),
  },
}));

vi.mock('@/features/reviews/model/use-reviews', () => ({
  useBarbershopReviews: () => ({ data: fixture.reviews, isLoading: false }),
}));

import { useOwnerProfilePreview } from '../model/use-owner-profile-preview';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('Owner Profile Preview — Hook useOwnerProfilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. agrega barbearia, serviços, galeria e avaliações calculando 100% de prontidão quando tudo está preenchido', async () => {
    const { result } = renderHook(() => useOwnerProfilePreview(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.shopName).toBe('Barbearia Vintage Alfa');
    expect(result.current.totalCount).toBe(6);
    expect(result.current.completedCount).toBe(6);
    expect(result.current.readinessPercent).toBe(100);

    // Mídia do Feed Explorar
    expect(result.current.previewExploreItem.media.length).toBeGreaterThanOrEqual(2);
    expect(result.current.previewExploreItem.media[0].kind).toBe('service');
    expect(result.current.previewExploreItem.media[0].service?.title).toBe('Corte Degradê Navalhado');
    expect(result.current.previewExploreItem.media[1].kind).toBe('environment');

    // Dados para o Card de Busca
    expect(result.current.previewPublicShop.name).toBe('Barbearia Vintage Alfa');
    expect(result.current.previewPublicShop.featuredServices?.length).toBe(1);
    expect(result.current.previewPublicShop.photos?.length).toBe(3); // Capa + 2 fotos de galeria
  });

  it('2. detecta pendências no checklist quando falta avatar ou fotos de ambiente', async () => {
    const originalShop = fixture.shopDetails;
    const originalSessionShop = fixture.session.barbershop;
    fixture.shopDetails = {
      ...originalShop,
      avatarUrl: null as any,
    };
    fixture.session.barbershop = {
      ...originalSessionShop,
      avatarUrl: null as any,
    };
    const originalGallery = fixture.gallery;
    fixture.gallery = [];

    try {
      const { result } = renderHook(() => useOwnerProfilePreview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const logoItem = result.current.checklist.find((c) => c.id === 'logo');
      const galleryItem = result.current.checklist.find((c) => c.id === 'gallery');

      expect(logoItem?.isComplete).toBe(false);
      expect(galleryItem?.isComplete).toBe(false);
      expect(result.current.completedCount).toBe(4);
      expect(result.current.readinessPercent).toBe(67);
    } finally {
      fixture.shopDetails = originalShop;
      fixture.session.barbershop = originalSessionShop;
      fixture.gallery = originalGallery;
    }
  });

  it('3. identifica ausência de serviços em destaque no checklist', async () => {
    const originalServices = fixture.services;
    fixture.services = {
      ...originalServices,
      items: [
        {
          ...originalServices.items[0],
          isFeatured: false,
        },
      ],
    };

    try {
      const { result } = renderHook(() => useOwnerProfilePreview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const featuredItem = result.current.checklist.find((c) => c.id === 'featured');
      expect(featuredItem?.isComplete).toBe(false);
      expect(result.current.completedCount).toBe(5);
      expect(result.current.readinessPercent).toBe(83);
    } finally {
      fixture.services = originalServices;
    }
  });
});
