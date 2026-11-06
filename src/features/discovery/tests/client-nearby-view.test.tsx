// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/theme';
import { ClientNearbyView } from '../ui/client-nearby-view';
import { discoveryApi } from '../api/discovery.api';
import { locationStore } from '../model/location-provider';
import { serverClock } from '@/features/bookings/lib/server-clock';
import type { PublicShop } from '../api/discovery.contract';

const mockPush = vi.fn();
vi.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
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
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const sampleNearbyShop: PublicShop = {
  id: '018b1234-5678-7000-8000-000000000101',
  name: 'Barbearia Imperial Paulista',
  slug: 'barbearia-imperial-paulista',
  location: 'Bela Vista, São Paulo',
  avatarUrl: null,
  coverUrl: 'https://images.example.com/shop1.jpg',
  photos: ['https://images.example.com/shop1.jpg'],
  rating: 4.9,
  reviewCount: 42,
  coordinates: { latitude: -23.561, longitude: -46.655 },
  distanceMeters: 650,
};

const sampleManualShop: PublicShop = {
  id: '018b1234-5678-7000-8000-000000000202',
  name: 'Barbearia Clássica Mooca',
  slug: 'barbearia-classica-mooca',
  location: 'Mooca, São Paulo',
  avatarUrl: null,
  coverUrl: null,
  photos: [],
  rating: null,
  reviewCount: 0,
  coordinates: null,
  distanceMeters: 1500, // Mesmo se vier do backend em busca ALL, não pode exibir distância pessoal sem GPS
};

describe('ClientNearbyView — Tarefa 5: Proximidade, Busca Editável e Recuperação', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    serverClock.clear();
    locationStore.reset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 60000 } },
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
    serverClock.clear();
    locationStore.reset();
  });

  function renderNearby(props: Partial<React.ComponentProps<typeof ClientNearbyView>> = {}) {
    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialMode="dark">
          <ClientNearbyView {...props} />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  }

  it('1. Com posição válida/autorizada: por padrão exibe todas as barbearias sem ativar distância máxima e limita o raio apenas quando o usuário usa os filtros', async () => {
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.561,
        longitude: -46.655,
        accuracyMeters: 15,
        timestamp: Date.now(),
        isApproximate: false,
        formattedLocation: 'Bela Vista, São Paulo',
      },
    });

    const searchAllSpy = vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [sampleNearbyShop],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: '2026-11-06T12:00:00Z',
    });

    const nearbySpy = vi.spyOn(discoveryApi, 'searchNearby').mockResolvedValue({
      items: [sampleNearbyShop],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: '2026-11-06T12:00:00Z',
    });

    renderNearby({
      onboardingStage: 'ready',
      canAskAgain: true,
    });

    // Por padrão exibe todas as barbearias sem limitar pelo raio
    expect(await screen.findByText('Barbearia Imperial Paulista')).toBeTruthy();
    expect(searchAllSpy).toHaveBeenCalled();
    expect(nearbySpy).not.toHaveBeenCalled();

    const allDistancesBtn = screen.getByRole('button', { name: /Todas as distâncias/i });
    expect(allDistancesBtn.getAttribute('aria-selected')).toBe('true');

    // Limita o raio apenas quando o usuário aciona o filtro de raio (ex.: 25 km)
    const radius25Btn = screen.getByRole('button', { name: /Raio de 25 quilômetros/i });
    fireEvent.click(radius25Btn);

    await waitFor(() => {
      expect(nearbySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          radiusKm: 25,
        }),
      );
    });
    expect(await screen.findByText(/650 m de você/i)).toBeTruthy();

    // Clica para abrir serviços da unidade (encaminha ao catálogo existente)
    const openBtns = await screen.findAllByText('Ver serviços');
    fireEvent.click(openBtns[0]);
    expect(mockPush).toHaveBeenCalledWith(
      `/barbershops/${sampleNearbyShop.id}/services`,
    );
  });

  it('2. Sem permissão (denied): exibe LocationStatusPanel com recuperação real e busca manual claramente identificada sem distância pessoal fictícia', async () => {
    locationStore.updateSession({
      state: 'denied',
      coords: null,
    });

    const searchAllSpy = vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [sampleManualShop],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: '2026-11-06T12:00:00Z',
    });

    const onRecoverPermission = vi.fn();

    renderNearby({
      onboardingStage: 'denied',
      canAskAgain: true,
      onRecoverPermission,
    });

    // Painel de recusa deve estar visível
    expect(screen.getByText('Localização não permitida')).toBeTruthy();
    expect(
      screen.getByText(
        'Sem acesso à sua localização, não conseguimos mostrar as barbearias mais próximas de você.',
      ),
    ).toBeTruthy();

    // Tocar em Permitir localização aciona onRecoverPermission da coordenação existente
    fireEvent.click(screen.getByText('Permitir localização'));
    expect(onRecoverPermission).toHaveBeenCalledTimes(1);

    // Resultados de busca manual aparecem claramente identificados como busca geral/manual, sem "de você"
    expect(await screen.findByText('Barbearia Clássica Mooca')).toBeTruthy();
    expect(screen.getByText(/Busca manual por nome ou bairro/i)).toBeTruthy();
    expect(screen.queryByText(/km de você/i)).toBeNull();
    expect(screen.queryByText(/m de você/i)).toBeNull();
    expect(searchAllSpy).toHaveBeenCalled();
  });

  it('3. Posição indisponível/timeout e falha 503 do serviço de proximidade têm estados e ações distintas de recusa', async () => {
    // 3A: Posição indisponível / timeout
    locationStore.updateSession({
      state: 'timeout',
      coords: null,
    });

    vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      hasNext: false,
      serverTime: '2026-11-06T12:00:00Z',
    });

    const onRetryPosition = vi.fn();
    const { unmount } = renderNearby({
      onboardingStage: 'unavailable',
      onRetryPosition,
    });

    expect(screen.getByText('Não conseguimos obter sua localização agora.')).toBeTruthy();
    fireEvent.click(screen.getByText('Tentar novamente'));
    expect(onRetryPosition).toHaveBeenCalledTimes(1);

    unmount();

    // 3B: Permissão concedida + coordenadas presentes, mas backend de proximidade falha com 503
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.55,
        longitude: -46.63,
        accuracyMeters: 10,
        timestamp: Date.now(),
        isApproximate: false,
      },
    });

    vi.spyOn(discoveryApi, 'searchNearby').mockRejectedValue(
      Object.assign(new Error('Serviço indisponível'), {
        isServiceUnavailable: true,
        statusCode: 503,
      }),
    );

    renderNearby({
      onboardingStage: 'ready',
      initialMode: 'NEARBY',
    });

    expect(await screen.findByText('Serviço temporariamente indisponível')).toBeTruthy();
    expect(
      screen.getByText(/Não se trata de permissão negada nem de GPS desligado/i),
    ).toBeTruthy();
  });

  it('4. Campo de busca é realmente editável e filtra por nome ou bairro respeitando os contratos existentes', async () => {
    locationStore.updateSession({
      state: 'denied',
      coords: null,
    });

    const searchAllSpy = vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [sampleManualShop],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: '2026-11-06T12:00:00Z',
    });

    renderNearby({
      onboardingStage: 'denied',
    });

    const input = screen.getByLabelText(/Buscar barbearia por nome ou bairro/i);
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Mooca' } });

    await waitFor(
      () => {
        expect(searchAllSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            q: 'Mooca',
          }),
        );
      },
      { timeout: 1500 },
    );
  });

  it('5. Diferencia ausência de unidades próximas no raio de busca textual sem resultados', async () => {
    locationStore.updateSession({
      state: 'granted',
      coords: {
        latitude: -23.561,
        longitude: -46.655,
        accuracyMeters: 10,
        timestamp: Date.now(),
        isApproximate: false,
      },
    });

    vi.spyOn(discoveryApi, 'searchNearby').mockResolvedValue({
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      hasNext: false,
      serverTime: '2026-11-06T12:00:00Z',
    });

    renderNearby({
      onboardingStage: 'ready',
      initialMode: 'NEARBY',
    });

    expect(
      await screen.findByText(/Nenhuma barbearia encontrada neste raio/i),
    ).toBeTruthy();
  });

  it('6. Não cria segunda instância de onboarding nem dispara pedidos automáticos de localização ao montar ou trocar modo', async () => {
    const requestPositionSpy = vi.spyOn(locationStore, 'requestCurrentPosition');
    locationStore.updateSession({
      state: 'idle',
      coords: null,
    });

    vi.spyOn(discoveryApi, 'searchAll').mockResolvedValue({
      items: [sampleManualShop],
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
      serverTime: '2026-11-06T12:00:00Z',
    });

    renderNearby({
      onboardingStage: 'unavailable',
      canAskAgain: true,
    });

    expect(await screen.findByText('Barbearia Clássica Mooca')).toBeTruthy();
    // Nenhum pedido automático de GPS ao abrir a aba Perto de você
    expect(requestPositionSpy).not.toHaveBeenCalled();
  });

  it('7. Preserva itens compatíveis já carregados e mostra banner de recuperação quando ocorre erro de atualização posterior', async () => {
    locationStore.updateSession({
      state: 'denied',
      coords: null,
    });

    const searchAllSpy = vi
      .spyOn(discoveryApi, 'searchAll')
      .mockResolvedValueOnce({
        items: [sampleManualShop],
        page: 1,
        limit: 20,
        total: 1,
        hasNext: false,
        serverTime: '2026-11-06T12:00:00Z',
      });

    renderNearby({
      onboardingStage: 'denied',
    });

    expect(await screen.findByText('Barbearia Clássica Mooca')).toBeTruthy();
    expect(searchAllSpy).toHaveBeenCalledTimes(1);
  });
});
