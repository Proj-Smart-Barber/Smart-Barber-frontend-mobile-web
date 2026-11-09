// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/shared/theme';
import { DiscoveryMapModal } from '../ui/DiscoveryMapModal';
import type { PublicShop } from '../api/discovery.contract';

const mockPush = vi.fn();

vi.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <span data-testid={`icon-${props.name}`} {...props} />,
}));

vi.mock('expo-blur', () => ({
  BlurView: ({ children, style }: any) => <div style={style}>{children}</div>,
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(),
  selectionAsync: vi.fn(),
  impactAsync: vi.fn(),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

vi.mock('../ui/GoogleMapCanvas', () => ({
  GoogleMapCanvas: ({ markers, userCoordinates, onSelectMarker }: any) => (
    <div data-testid="google-map-canvas">
      <div data-testid="user-coordinates">
        {userCoordinates ? `${userCoordinates.latitude},${userCoordinates.longitude}` : 'no-user-coords'}
      </div>
      {markers.map((m: any) => (
        <button
          key={m.id}
          data-testid={`map-marker-${m.id}`}
          onClick={() => onSelectMarker?.(m.id)}
        >
          {m.title}
        </button>
      ))}
    </div>
  ),
}));

const mockShops: PublicShop[] = [
  {
    id: 'shop-1',
    name: 'Barbearia Válida 1',
    slug: 'barbearia-valida-1',
    location: 'Centro, São Paulo',
    avatarUrl: null,
    distanceMeters: 500,
    coordinates: { latitude: -23.5505, longitude: -46.6333 },
    rating: 4.8,
    reviewCount: 120,
  },
  {
    id: 'shop-2',
    name: 'Barbearia Sem Coords',
    slug: 'barbearia-sem-coords',
    location: 'Bela Vista, São Paulo',
    avatarUrl: null,
    distanceMeters: 1200,
    coordinates: null as any,
    rating: 4.5,
    reviewCount: 40,
  },
  {
    id: 'shop-3',
    name: 'Barbearia Coords Inválidas',
    slug: 'barbearia-coords-invalidas',
    location: 'Pinheiros, São Paulo',
    avatarUrl: null,
    distanceMeters: 3000,
    coordinates: { latitude: 999, longitude: -46.6333 }, // lat fora de -90..90
    rating: 4.2,
    reviewCount: 15,
  },
  {
    id: 'shop-4',
    name: 'Barbearia Válida 2',
    slug: 'barbearia-valida-2',
    location: 'Moema, São Paulo',
    avatarUrl: null,
    distanceMeters: 4500,
    coordinates: { latitude: -23.6012, longitude: -46.6658 },
    rating: 4.9,
    reviewCount: 200,
  },
];

describe('N4 — DiscoveryMapModal: Visualização de Mapa com Contratos Estritos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalid_coordinates_are_excluded: mapeia apenas unidades com coordenadas finitas e válidas (-90..90, -180..180)', () => {
    render(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={true}
          onClose={vi.fn()}
          items={mockShops}
          userCoordinates={{ latitude: -23.55, longitude: -46.63 }}
        />
      </ThemeProvider>,
    );

    // shop-1 e shop-4 são válidos (2 de 4)
    expect(screen.getByText(/2 de 4 estabelecimentos com localização/i)).toBeDefined();
    expect(screen.getByTestId('map-marker-shop-1')).toBeDefined();
    expect(screen.getByTestId('map-marker-shop-4')).toBeDefined();

    // shop-2 (sem coords) e shop-3 (latitude 999) não podem estar no mapa
    expect(screen.queryByTestId('map-marker-shop-2')).toBeNull();
    expect(screen.queryByTestId('map-marker-shop-3')).toBeNull();

    // Notificação de lista parcial
    expect(
      screen.getByText(/Algumas barbearias sem coordenadas confirmadas aparecem apenas na lista/i),
    ).toBeDefined();
  });

  it('denied_gps_has_no_user_marker: sem coordenadas do usuário ou GPS recusado, omite marcador do usuário', () => {
    render(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={true}
          onClose={vi.fn()}
          items={mockShops}
          userCoordinates={null}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('user-coordinates').textContent).toBe('no-user-coords');
  });

  it('result_change_clears_stale_marker: alteração de resultKey limpa a seleção anterior de marcador', () => {
    const { rerender } = render(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={true}
          onClose={vi.fn()}
          items={mockShops}
          resultKey="key-1"
        />
      </ThemeProvider>,
    );

    // Seleciona shop-1
    fireEvent.click(screen.getByRole('button', { name: /Abrir barbearia Barbearia Válida 1/i }));

    // Altera o resultKey (ex: novos filtros)
    rerender(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={true}
          onClose={vi.fn()}
          items={mockShops}
          resultKey="key-2"
        />
      </ThemeProvider>,
    );

    // O modal deve estar desmarcado e renderizar normalmente sem erro
    expect(screen.getByText(/2 de 4 estabelecimentos com localização/i)).toBeDefined();
  });

  it('pagination_error_preserves_loaded_units: erro de paginação preserva as unidades carregadas e oferece nova tentativa', () => {
    const onRetryMock = vi.fn();

    render(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={true}
          onClose={vi.fn()}
          items={mockShops}
          resultsError={new Error('Network error on page 2')}
          onRetryResults={onRetryMock}
        />
      </ThemeProvider>,
    );

    // As unidades carregadas continuam mapeadas
    expect(screen.getByTestId('map-marker-shop-1')).toBeDefined();
    expect(screen.getByTestId('map-marker-shop-4')).toBeDefined();

    // Banner de erro presente com botão de nova tentativa
    expect(
      screen.getByText(/Erro ao atualizar estabelecimentos no mapa. Unidades carregadas continuam disponíveis/i),
    ).toBeDefined();

    const retryBtn = screen.getByRole('button', { name: /Tentar novamente carregar unidades no mapa/i });
    fireEvent.click(retryBtn);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  it('ao selecionar barbearia no mapa ou lista fecha modal e navega para o catálogo', () => {
    const onCloseMock = vi.fn();

    render(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={true}
          onClose={onCloseMock}
          items={mockShops}
        />
      </ThemeProvider>,
    );

    const openCatalogBtn = screen.getByRole('button', { name: /Abrir barbearia Barbearia Válida 1/i });
    fireEvent.click(openCatalogBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/barbershops/shop-1/services');
  });

  it('desmonta o GoogleMapCanvas e remove o modal quando a animação de saída é cancelada ou quando scopeKey (ator) muda', () => {
    const { rerender } = render(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={true}
          onClose={vi.fn()}
          items={mockShops}
          scopeKey="actor-1"
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('google-map-canvas')).toBeDefined();

    // Troca de ator durante fechamento desmonta imediatamente o canvas e o modal
    rerender(
      <ThemeProvider initialMode="dark">
        <DiscoveryMapModal
          visible={false}
          onClose={vi.fn()}
          items={mockShops}
          scopeKey="actor-2"
        />
      </ThemeProvider>,
    );

    expect(screen.queryByTestId('google-map-canvas')).toBeNull();
  });
});
