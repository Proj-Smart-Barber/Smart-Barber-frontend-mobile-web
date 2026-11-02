// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ThemeProvider } from '@/shared/theme';
import { BarbershopCard, formatDistance } from '../ui/BarbershopCard';
import { BarbershopPhotoCarousel } from '../ui/BarbershopPhotoCarousel';
import { BarbershopHomeCarousel } from '../ui/BarbershopHomeCarousel';
import type { PublicShop } from '../api/discovery.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider initialMode="dark">{ui}</ThemeProvider>);
}

const mockShop: PublicShop = {
  id: '0192e228-5678-7000-8000-000000000001',
  name: 'Barbearia Horizonte & Estilo',
  slug: 'barbearia-horizonte-estilo',
  location: 'Av. Paulista, 1000 - Bela Vista, São Paulo',
  avatarUrl: 'https://images.unsplash.com/photo-logo-test.jpg',
  coverUrl: 'https://images.unsplash.com/photo-cover-test.jpg',
  photos: [
    'https://images.unsplash.com/photo-1-test.jpg',
    'https://images.unsplash.com/photo-2-test.jpg',
    'https://images.unsplash.com/photo-3-test.jpg',
    'https://images.unsplash.com/photo-4-extra.jpg',
  ],
  rating: 4.9,
  reviewCount: 38,
  distanceMeters: 1500,
  coordinates: {
    latitude: -23.561684,
    longitude: -46.655981,
  },
};

describe('Discovery UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatDistance helper', () => {
    it('retorna null para valores nulos, indefinidos ou NaN', () => {
      expect(formatDistance(null)).toBeNull();
      expect(formatDistance(undefined as any)).toBeNull();
      expect(formatDistance(NaN)).toBeNull();
    });

    it('formata distâncias menores que 1000m em metros arredondados', () => {
      expect(formatDistance(250)).toBe('250 m de você');
      expect(formatDistance(499.6)).toBe('500 m de você');
      expect(formatDistance(999)).toBe('999 m de você');
    });

    it('formata distâncias a partir de 1000m em km com vírgula e 1 casa decimal', () => {
      expect(formatDistance(1000)).toBe('1,0 km de você');
      expect(formatDistance(1400)).toBe('1,4 km de você');
      expect(formatDistance(1500)).toBe('1,5 km de você');
      expect(formatDistance(12800)).toBe('12,8 km de você');
    });
  });

  describe('BarbershopPhotoCarousel', () => {
    it('renderiza placeholder decorativo quando não há fotos nem capa', () => {
      renderWithTheme(
        <BarbershopPhotoCarousel
          photos={[]}
          coverUrl={null}
          barbershopName="Unidade Sem Foto"
        />,
      );

      expect(screen.getByText(/Ambiente The Obsidian Atelier/i)).toBeDefined();
    });

    it('renderiza foto única sem paginação quando apenas a capa existe', () => {
      const { container } = renderWithTheme(
        <BarbershopPhotoCarousel
          photos={[]}
          coverUrl="https://images.unsplash.com/single-cover.jpg"
          barbershopName="Unidade Capa Única"
        />,
      );

      const images = container.querySelectorAll('img');
      expect(images.length).toBe(1);
      // Não deve exibir botão com paginação quando só há 1 foto
      expect(screen.queryByLabelText(/Foto 1 de 2/i)).toBeNull();
    });

    it('limita no máximo a 3 fotos e exibe indicador acessível de paginação', () => {
      const { container } = renderWithTheme(
        <BarbershopPhotoCarousel
          photos={mockShop.photos}
          coverUrl={mockShop.coverUrl}
          barbershopName={mockShop.name}
        />,
      );

      // Deve ter exatamente 3 slides de imagem montados no carrossel
      const images = container.querySelectorAll('img');
      expect(images.length).toBe(3);

      // Slides acessíveis de foto 1, 2 e 3 de 3
      expect(screen.getByLabelText(/Foto 1 de 3 da barbearia/i)).toBeDefined();
      expect(screen.getByLabelText(/Foto 2 de 3 da barbearia/i)).toBeDefined();
      expect(screen.getByLabelText(/Foto 3 de 3 da barbearia/i)).toBeDefined();
    });

    it('dispara onPress ao clicar no slide da foto', () => {
      const onPressSpy = vi.fn();
      renderWithTheme(
        <BarbershopPhotoCarousel
          photos={mockShop.photos}
          barbershopName={mockShop.name}
          onPress={onPressSpy}
        />,
      );

      const slide = screen.getByLabelText(/Foto 1 de 3 da barbearia/i);
      fireEvent.click(slide);
      expect(onPressSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('BarbershopHomeCarousel', () => {
    it('retorna null se a lista de barbearias estiver vazia', () => {
      const { container } = renderWithTheme(<BarbershopHomeCarousel items={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renderiza os cards das barbearias com capa, logo, nome, distância e avaliação', () => {
      renderWithTheme(<BarbershopHomeCarousel items={[mockShop]} />);

      expect(screen.getByText('Barbearia Horizonte & Estilo')).toBeDefined();
      expect(screen.getByText('1,5 km de você')).toBeDefined();
      expect(screen.getByText('4.9 (38)')).toBeDefined();
      expect(screen.getByText('Av. Paulista, 1000 - Bela Vista, São Paulo')).toBeDefined();
    });

    it('navega para o catálogo ao clicar no card', () => {
      const onSelectShop = vi.fn();
      renderWithTheme(<BarbershopHomeCarousel items={[mockShop]} onSelectShop={onSelectShop} />);

      const card = screen.getByRole('button', { name: /Barbearia Barbearia Horizonte & Estilo/i });
      fireEvent.click(card);
      expect(onSelectShop).toHaveBeenCalledWith(mockShop);
    });

    it('usa router.push quando onSelectShop não for fornecido', () => {
      renderWithTheme(<BarbershopHomeCarousel items={[mockShop]} />);

      const card = screen.getByRole('button', { name: /Barbearia Barbearia Horizonte & Estilo/i });
      fireEvent.click(card);
      expect(mockPush).toHaveBeenCalledWith(`/barbershops/${mockShop.id}/services`);
    });
  });

  describe('BarbershopCard', () => {
    it('renderiza card completo em Explorar com carrossel de fotos, avaliação e CTA', () => {
      renderWithTheme(<BarbershopCard shop={mockShop} />);

      expect(screen.getByText('Barbearia Horizonte & Estilo')).toBeDefined();
      expect(screen.getByText('4.9 (38)')).toBeDefined();
      expect(screen.getByText('1,5 km de você')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Ver serviços' })).toBeDefined();
    });

    it('exibe "Sem avaliações" quando reviewCount é 0 ou nulo', () => {
      const shopWithoutReviews: PublicShop = {
        ...mockShop,
        rating: null,
        reviewCount: 0,
      };

      renderWithTheme(<BarbershopCard shop={shopWithoutReviews} />);
      expect(screen.getByText('Sem avaliações')).toBeDefined();
    });

    it('navega para o catálogo ao clicar no botão Ver serviços', () => {
      renderWithTheme(<BarbershopCard shop={mockShop} />);

      const cta = screen.getByRole('button', { name: 'Ver serviços' });
      fireEvent.click(cta);
      expect(mockPush).toHaveBeenCalledWith(`/barbershops/${mockShop.id}/services`);
    });

    it('navega para o catálogo ao clicar no bloco de informações da barbearia', () => {
      renderWithTheme(<BarbershopCard shop={mockShop} />);

      const infoButton = screen.getByRole('button', { name: /Toque para ver detalhes/i });
      fireEvent.click(infoButton);
      expect(mockPush).toHaveBeenCalledWith(`/barbershops/${mockShop.id}/services`);
    });
  });
});
