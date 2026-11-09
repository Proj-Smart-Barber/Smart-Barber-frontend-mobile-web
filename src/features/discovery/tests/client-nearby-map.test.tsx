// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { ClientNearbyView } from '../ui/client-nearby-view';
import { discoveryApi } from '../api/discovery.api';
import { locationStore } from '../model/location-provider';
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
  GoogleMapCanvas: ({ markers, userCoordinates }: any) => (
    <div data-testid="google-map-canvas">
      <div data-testid="map-user-coords">
        {userCoordinates ? `${userCoordinates.latitude},${userCoordinates.longitude}` : 'no-user'}
      </div>
      {markers.map((m: any) => (
        <span key={m.id} data-testid={`canvas-marker-${m.id}`}>
          {m.title}
        </span>
      ))}
    </div>
  ),
}));

const sampleShops: PublicShop[] = [
  {
    id: 'shop-alpha',
    name: 'Barbearia Alfa Mapeável',
    slug: 'barbearia-alfa-mapeavel',
    location: 'Pinheiros, São Paulo',
    avatarUrl: null,
    distanceMeters: 800,
    coordinates: { latitude: -23.56, longitude: -46.70 },
    rating: 4.8,
    reviewCount: 95,
  },
  {
    id: 'shop-beta',
    name: 'Barbearia Beta Sem Coordenadas',
    slug: 'barbearia-beta-sem-coordenadas',
    location: 'Vila Madalena, São Paulo',
    avatarUrl: null,
    distanceMeters: 1400,
    coordinates: null as any,
    rating: 4.6,
    reviewCount: 30,
  },
];

describe('N4 — ClientNearbyView + Mapa: Integração sem Consultas Extras', () => {
  let queryClient: QueryClient;
  let searchAllSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    locationStore.reset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60000 } },
    });

    searchAllSpy = vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: sampleShops,
      total: 2,
      page: 1,
      limit: 20,
      hasNext: false,
      serverTime: '2026-11-08T12:00:00Z',
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientNearbyView initialQuery="Vila Mariana" />
        </ThemeProvider>
      </QueryClientProvider>,
    );

  it('map_uses_same_filtered_shop_ids: mapa reutiliza os mesmos resultados da lista sem nova query', async () => {
    renderComponent();

    // Aguarda carregar as barbearias
    expect(await screen.findByText('Barbearia Alfa Mapeável')).toBeDefined();
    expect(screen.getByText('Barbearia Beta Sem Coordenadas')).toBeDefined();

    const initialQueryCount = searchAllSpy.mock.calls.length;

    // Localiza e clica no botão "Mapa"
    const mapBtn = screen.getByRole('button', { name: /Abrir mapa de barbearias/i });
    expect(mapBtn).toBeDefined();

    fireEvent.click(mapBtn);

    // O modal abre com o GoogleMapCanvas
    expect(await screen.findByTestId('google-map-canvas')).toBeDefined();
    // Apenas shop-alpha (com coordenadas válidas) tem pin
    expect(screen.getByTestId('canvas-marker-shop-alpha')).toBeDefined();
    expect(screen.queryByTestId('canvas-marker-shop-beta')).toBeNull();

    // opening_map_does_not_request_location_or_start_another_discovery_query
    expect(searchAllSpy.mock.calls.length).toBe(initialQueryCount);
  });

  it('map_open_close_preserves_filters_and_scroll: abrir e fechar o mapa preserva os dados e a lista', async () => {
    renderComponent();

    expect(await screen.findByText('Barbearia Alfa Mapeável')).toBeDefined();

    // Abre mapa
    const mapBtn = screen.getByRole('button', { name: /Abrir mapa de barbearias/i });
    fireEvent.click(mapBtn);

    expect(screen.getByTestId('google-map-canvas')).toBeDefined();

    // Fecha mapa
    const closeBtn = screen.getByRole('button', { name: /Fechar visualização de mapa/i });
    fireEvent.click(closeBtn);

    // Lista continua montada e acessível com todos os itens
    expect(screen.getAllByText('Barbearia Alfa Mapeável').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Barbearia Beta Sem Coordenadas')).toBeDefined();
  });

  it('denied_gps_has_no_user_marker: sem GPS concedido, mapa não exibe posição do usuário', async () => {
    // Configura sessão de localização como negada
    locationStore.updateSession({ state: 'denied', coords: null, errorMessage: 'denied' });

    renderComponent();

    expect(await screen.findByText('Barbearia Alfa Mapeável')).toBeDefined();

    const mapBtn = screen.getByRole('button', { name: /Abrir mapa de barbearias/i });
    fireEvent.click(mapBtn);

    const userCoords = await screen.findByTestId('map-user-coords');
    expect(userCoords.textContent).toBe('no-user');
  });

  it('botão Mapa exibe estado desabilitado com explicação quando não há unidades com coordenadas', async () => {
    searchAllSpy.mockResolvedValueOnce({
      items: [
        {
          id: 'shop-no-coords',
          name: 'Sem Localização',
          slug: 'sem-localizacao',
          location: 'Rua Desconhecida',
          avatarUrl: null,
          coordinates: null as any,
          distanceMeters: null,
          rating: 4.0,
          reviewCount: 5,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      hasNext: false,
      serverTime: '2026-11-08T12:00:00Z',
    });

    renderComponent();

    expect(await screen.findByText('Sem Localização')).toBeDefined();

    // Botão Mapa deve estar desabilitado
    const mapBtn = screen.getByRole('button', { name: /Abrir mapa de barbearias/i });
    expect(mapBtn.getAttribute('aria-disabled')).toBe('true');

    // Mensagem de explicação
    expect(
      screen.getByText('Nenhuma barbearia com localização disponível para o mapa.'),
    ).toBeDefined();
  });
});
